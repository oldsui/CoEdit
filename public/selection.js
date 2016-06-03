

    // Range has `anchor` and `head` properties, which are zero-based indices into
    // the document. The `anchor` is the side of the selection that stays fixed,
    // `head` is the side of the selection where the cursor is. When both are
    // equal, the range represents a cursor.
    function Range (anchor, head) {
        this.anchor = anchor;
        this.head = head;
    }


    Range.prototype.equals = function (other) {
        return this.anchor === other.anchor && this.head === other.head;
    };

    Range.prototype.isEmpty = function () {
        return this.anchor === this.head;
    };




    Range.prototype.transform = function (other) {

        // transform an index based on other.ops
        function transformIndex (index) {
            var newIndex = index;
            var ops = other.ops;
            for (var i = 0, l = other.ops.length; i < l; i++) {
                if (Operation.isRetain(ops[i])) {
                    index -= ops[i];
                }
                else if (Operation.isInsert(ops[i])) {
                    newIndex += ops[i].length;
                }
                else {
                    newIndex -= Math.min(index, -ops[i]);
                    index += ops[i];
                }
                if (index < 0) {
                    break;
                }
            }
            return newIndex;
        }

        var newAnchor = transformIndex(this.anchor);
        if (this.anchor === this.head) {
            return new Range(newAnchor, newAnchor);
        }
        return new Range(newAnchor, transformIndex(this.head));
    };




    // A selection is basically an array of ranges. Every range represents a real
    // selection or a cursor in the document (when the start position equals the
    // end position of the range). The array must not be empty.
    function Selection (ranges) {
        this.ranges = ranges || [];
    }

    Selection.Range = Range;

    // Convenience method for creating selections only containing a single cursor
    // and no real selection range.
    Selection.createCursor = function (position) {
        return new Selection([new Range(position, position)]);
    };


    Selection.prototype.equals = function (other) {
        if (this.position !== other.position) { return false; }
        if (this.ranges.length !== other.ranges.length) { return false; }
        // FIXME: Sort ranges before comparing them?
        for (var i = 0; i < this.ranges.length; i++) {
            if (!this.ranges[i].equals(other.ranges[i])) { return false; }
        }
        return true;
    };

    
    Selection.prototype.somethingSelected = function () {
        for (var i = 0; i < this.ranges.length; i++) {
            if (!this.ranges[i].isEmpty()) { return true; }
        }
        return false;
    };

    
    // Return the more current selection information.
    Selection.prototype.compose = function (other) {
        return other;
    };


    // Update the selection with respect to an operation.
    Selection.prototype.transform = function (other) {
        for (var i = 0, newRanges = []; i < this.ranges.length; i++) {
            newRanges[i] = this.ranges[i].transform(other);
        }
        return new Selection(newRanges);
    };



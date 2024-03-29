class BiPolyNumber extends PolyNumber {
    static FORMS = [['x', 'y'], ['y', 'x']];
    static EXPRESSION = new Expression();
    static NOTATION = [new ColumnNotation(), new RowNotation()];
    static EXTENDED = [new ColumnExtended(), new RowExtended()];

    static fromRowAndColumn(row, column) {
        column = column instanceof PolyNumber ? column.array : column;
        row = row instanceof PolyNumber ? row.array : row;
        if (column.length === 0) column.push(0);
        if (row.length === 0) row.push(0);
        
        const columns = [[...column]];
        columns.length = row.length;

        for (const [i, co] of row.entries()) {
            if (i === 0)
                columns[i][0] += co;
            else
                columns[i] = [co];
        }

        return new BiPolyNumber(columns);
    }

    toString() {return this.expression};
    get expression() {return merge(this.terms).join('')}
    get terms() {
        if (this.is_zero)
            return [[''], [`0${this.variable}°`]];

        const terms = Array(this.coeff.length).fill('');
        const operators = Array(this.coeff.length).fill(' + ');

        for (let [i, coefficient] of this.coeff.entries) {
            if (coefficient !== 0) {
                if (coefficient < 0) {
                    operators[i] = ' - ';
                    coefficient *= -1;
                }

                terms[i] = [
                    coefficient === 1 ? '' : coefficient,
                    i === 0 ? '' : this.variable,
                    i in EXPRESSION_SUFFIXES ? EXPRESSION_SUFFIXES[i] : i
                ].join('');
            }
        }

        return [operators, terms];
    }


    get msc() {
        return {
            x: this.row_degrees.reverse().indexOf(this.degX), 
            y: this.column_degrees.reverse().indexOf(this.degY)
        };
    };

    get rows() {
        const rows = grid2D(this.width, this.height, 0);
        for (const [c, column] of this.array.entries())
            for (const [r, coefficient] of column.coeff.entries())
                rows[c][r] = coefficient;

        return rows.map(row => new PolyNumber(row, ORIENTATION.ROW));
    }

    get degX() {return max(...this.row_degrees)}
    get degY() {return max(...this.column_degrees)}
    get deg() {
        if (!this.is_zero)
            return this.array.length === 1 ? 
                {x: 0,         y: this.array[0].deg} : 
                {x: this.degX, y: this.degY};
    }
    
    get is_zero() {return all_zeros(this.array)}
    zeros = (up_to=this.array.length) => all_zeros(this.array, up_to);
    copy = () => new this.constructor(this.array.map(p => p.copy()));
    equals(other) {
        if (this.array.length !== other.array.length)
            return false;

        for (const [c, column] of this.array.entries())
            if (!column.equals(other.array[c]))
                return false;

        return true;
    }
    
    iclr() {
        for (const column of this.array)
            column.iclr();

        return this;
    }

    irep = (other) => this.constructor._replace(other, this);
    replacedWith(other) {return this.constructor._replace(other)}
    static _replace(other, replaced=null) {
        if (Object.is(other, replaced))
            return other;

        if (replaced === null)
            replaced = new this();
        
        if (other instanceof this) {
            replaced.array.length = other.array.length;
            for (const [c, column] of other.array.entries())
                replaced.array[c] = column.copy();
        }
            
        if (Array.isArray(other)) {
            replaced.array.length = other.length;
            for (const [c, column] of other.entries())
                replaced.array[c] = column instanceof PolyNumber ? column : new PolyNumber(column);
        }
        
        if (typeof other === 'number') {
            replaced.iclr();
            replaced.array[0] = other;
        }
        
        return replaced;
    }

    iinv = () => this.constructor._inverse(this, this);
    get inverted () {return this.constructor._inverse(this)};
    static _inverse(bi_polynumber, inverted=null) {
        if (!(inverted instanceof this))
            inverted = bi_polynumber.copy();

        for (const column of inverted.array)
            for (const i of column.coeff.keys())
                column.coeff[i] *= -1;

        return inverted;
    }

    ishf = (offset_x=0, offset_y=0) => this.constructor._shift(this, offset_x, offset_y, this);
    shiftedBy = (offset_x=0, offset_y=0) => this.constructor._shift(this, offset_x, offset_y);
    static _shift(bi_polynumber, offset_x=0, offset_y=0, shifted=null) {
        if (!(shifted instanceof this))
            shifted = new this();

        if (bi_polynumber.is_zero)
            return shifted.iclr();

        shifted.irep(bi_polynumber);

        if (offset_x > 0) {
            const height = bi_polynumber.height;
            for (let i = 0; i < offset_x; i++)
                shifted.array.unshift(new PolyNumber(zeros(height)));
        }

        if (offset_x < 0) {
            offset_x *= -1;
            for (let i = 0; i < offset_x; i++)
                shifted.array.shift();
        }

        if (offset_y !== 0) {
            for (const column of shifted.array)
                column.ishf(offset_y);
        }

        return shifted;
    }
    get is_shifter() {
        if (this.array[0].is_shifter) {
            if (this.array.length === 1)
                return true;

            const rest = this.copy();
            rest.array.shift();
            rest.itrp();

            if (rest.array[0].is_shifter) {
                if (rest.array.length === 1)
                    return true;

                rest.array.shift();
                if (rest.is_zero)
                    return true;
            }
        }

        return false;
    }

    itrp = () => this.constructor._transpose(this, this);
    get transposed () {return this.constructor._transpose(this)};
    static _transpose(bi_polynumber, transposed=null) {
        if (transposed === null)
            transposed = new this();

        transposed.columns = bi_polynumber.rows;

        return transposed;
    }

    itrl = (amount) => this.constructor._translate(this, amount, this);
    translatedBy = (amount) => this.constructor._translate(this, amount);
    static _translate(bi_polynumber, amount, translated=null) {
        if (!(translated instanceof this))
            translated = new this();

        translated.irep(bi_polynumber);
        if (amount !== 0)
            for (const column of translated.array) {
                const deg = column.deg;
                if (deg === undefined)
                    column.coeff[0] = amount;
                else
                    for (let i = 0; i <= deg; i++)
                        column.coeff[i] += amount;
            }

        return translated;
    }

    iscl  = (factor) => this.constructor._scale(this, factor, this);
    scaledBy = (factor) => this.constructor._scale(this, factor);
    static _scale(bi_polynumber, factor, scaled=null) {
        if (!(scaled instanceof this))
            scaled = new this();

        if (factor === 0 || bi_polynumber.is_zero)
            return scaled.iclr();

        scaled.irep(bi_polynumber);

        if (factor === 1)
            return scaled;
        
        if (factor === -1)
            return this._inverse(bi_polynumber, scaled);

        for (const column of scaled.array)
            column.iscl(factor);

        return scaled;
    }

    plus = (other) => this.constructor._add(this, other);
    iadd = (other) => this.constructor._add(this, other, this);
    static _add(left, right, added=null) {
        const number = new Sides(
            typeof left === 'number',
            typeof right === 'number'
        );
        switch (number.is) {
            case SIDE.left: return this._translate(right, left, added);
            case SIDE.right: return this._translate(left, right, added);
            case SIDE.both: return added.irep(left + right);
        }
        
        if (!(added instanceof this))
            added = new this();

        const sides = new Sides(left, right);
        switch (sides.is_zero) {
            case SIDE.both: return added.iclr();
            case SIDE.right: return added.irep(left);
            case SIDE.left: return added.irep(right);
        }

        const width = new Sides(left.width - 1, right.width - 1);
        for (let i = 0; i <= width.max; i++)
            switch (width.lessThan(i)) {
                case SIDE.both:
                    added.array[i].irep(left.array[i]);
                    added.array[i].iadd(right.array[i]);
                    break;
                case SIDE.left:
                    if (!Object.is(added, left))
                        added.array[i] = left.array[i].copy();
                    break;
                case SIDE.right:
                    if (!Object.is(added, right))
                        added.array[i] = right.array[i].copy();
            }

        return added;
    }
    static sum(bi_polynumbers, sum=null) {
        if (!(sum instanceof this))
            sum = new this();

        bi_polynumbers = bi_polynumbers.filter(p => p instanceof BiPolyNumber && !p.is_zero);
        if (bi_polynumbers.length === 0)
            return sum.iclr();

        if (bi_polynumbers.length === 1)
            return sum.irep(bi_polynumbers[0]);

        sum.iclr();

        const width = max(...bi_polynumbers.map(p => p.width));
        const height = max(...bi_polynumbers.map(p => p.height));
        const empty = sum.array[0];
        
        sum.array.length = width;
        empty.coeff.total_length = height;
        empty.coeff.fill(0);
        
        for (let c = 1; c < width; c++)
            sum.array[c] = empty.copy();
            
        for (const bi_polynumber of bi_polynumbers)
            for (const [x, column] of bi_polynumber.array)
                for (const [y, co] of column.coeff.entries())
                    sum.array[x].coeff[y] += co;

        return sum;
    }

    minus = (bi_polynumber) => this.constructor._subtract(this, bi_polynumber);
    isub = (bi_polynumber) => this.constructor._subtract(this, bi_polynumber, this);
    static _subtract(left, right, subtracted=null) {
        const number = new Sides(
            typeof left === 'number',
            typeof right === 'number'
        );
        switch (number.is) {
            case SIDE.both: return subtracted.irep(left - right);
            case SIDE.left: return subtracted.irep(left).isub(right);
            case SIDE.right: return this._translate(left, -right, subtracted);
        }
        
        if (!(subtracted instanceof this))
            subtracted = new this();

        const sides = new Sides(left, right);
        switch (sides.is_zero) {
            case SIDE.both: return subtracted.iclr();
            case SIDE.right: return subtracted.irep(left);
            case SIDE.left: return subtracted.irep(right).iinv();
        }

        const width = new Sides(left.width - 1, right.width - 1);
        for (let i = 0; i <= width.max; i++)
            switch (width.lessThan(i)) {
                case SIDE.both:
                    subtracted.array[i].irep(left.array[i]);
                    subtracted.array[i].isub(right.array[i]);
                    break;
                case SIDE.left:
                    if (!Object.is(subtracted, left))
                        subtracted.array[i] = left.array[i].copy();
                    break;
                case SIDE.right:
                    subtracted.array[i] = right.array[i].inverted;
            }

        return subtracted;
    }

    times = (bi_polynumber) => this.constructor._multiply(this, bi_polynumber);
    imul = (bi_polynumber) => this.constructor._multiply(this, bi_polynumber, this);
    static _multiply(left, right, product=null) {
        if (!(product instanceof this))
            product = new this();

        const number = new Sides(
            typeof left === 'number',
            typeof right === 'number'
        );
        switch (number.is) {
            case SIDE.left: return this._scale(right, left, product);
            case SIDE.right: return this._scale(left, right, product);
            case SIDE.both: return product.irep(left * right);
        }

        const deg = new Sides(left.deg, right.deg);
        if (deg.is_undefined !== SIDE.none)
            return product.iclr();

        const shifter = new Sides(left.is_shifter, right.is_shifter);
        switch (shifter.is) {
            case SIDE.left: return product.irep(right).ishf(deg.left.x, deg.left.y);
            // case SIDE.both: return product.irep(left).ishf(deg.right.x, deg.right.y);
            case SIDE.right: return product.irep(left).ishf(deg.right.x, deg.right.y);
        }

        const columns = [];
        for (const column of left.array)
            columns.push(Object.is(left, product) ? [...column.co] : column.co);

        product.iclr();

        for (const [x, column] of columns.entries())
            for (const [y, co] of column.entries())
                if (co !== 0)
                    product.iadd(right.scaledBy(co).ishf(x, y));

        return product;
    }
    static mul(factors, product=null) {
        if (factors.length === 0)
            return;

        if (!(product instanceof this))
            product = new this();

        if (factors.length === 1)
            return product.irep(factors[0]);

        const degrees = factors.map(p => p.deg);
        if (degrees.includes(undefined))
            return product.iclr();

        const product_paths = this._getProductPaths(degrees);
        product.array.length = product_paths.length;

        const column = [];
        const values = [];
        const results = [];

        for (const [x, y_paths] of product_paths.entries()) {
            column.length = y_paths.length;
            
            for (const [y, paths] of y_paths.entries()) {
                results.length = paths.length;

                for (const [i, path] of paths.entries()) {
                    for (const [f, [fx, fy]] of path.entries())
                        values.push(factors[f].array[fx].coeff[fy]);

                    results[i] = mul(values);
                }

                column[y] += sum(results);
            }

            product.array[x] = new PolyNumber(column);
        }

        return product;
    }

    over = (other) => this.constructor._divide(this, other);
    idiv = (other) => this.constructor._divide(this, other, this);
    static _divide(dividend, divisor, quotient=null) {
        if (divisor === 0 || divisor.is_zero)
            throw `Division by zero!`;

        if (!(quotient instanceof this))
            quotient = new this();

        const number = new Sides(
            typeof dividend === 'number',
            typeof divisor === 'number'
        );
        switch (number.is) {
            case SIDE.left: throw 'Number/PolyNumber division!!';
            case SIDE.right: return this._scale(dividend, (1.0 / divisor), quotient);
            case SIDE.both: return quotient.irep(dividend / divisor);
        }

        const deg = new Sides(dividend.deg, divisor.deg);
        switch (deg.is_undefined) {
            case SIDE.left: return quotient.iclr();
            case SIDE.right: throw `Division by zero!`;
            case SIDE.both: throw `Division by zero!`;
        }

        if (deg.right.x === 0 && deg.right.y === 0 && deg.left.x === 0 && deg.left.y === 0)
            return quotient.irep(dividend.array[0].coeff[0] / divisor.array[0].coeff[0]);

        const shifter = new Sides(dividend.is_shifter, divisor.is_shifter);
        switch (shifter.is) {
            case SIDE.left: return quotient.irep(divisor).ishf(-deg.left.x, -deg.left.y);
            case SIDE.both: return quotient.irep(dividend).ishf(-deg.right.x, -deg.right.y);
            case SIDE.right: return quotient.irep(dividend).ishf(-deg.right.x, -deg.right.y);
        }

        const remainder = dividend.copy();
        quotient.iclr();

        const temp = new PolyNumber();
        const denominator_msc = divisor.msc;

        let factor;
        let offset_x = deg.left.x - deg.right.x;
        let offset_y = deg.left.y - deg.right.y;

        while (offset_x >= 0 && offset_y >= 0) {
            factor = remainder.msc / denominator_msc;
            quotient.iadd(temp.irep(factor).ishf(offset_x, offset_y));
            remainder.isub(temp.irep(divisor).iscl(factor).ishf(offset_x, offset_y));
            if (remainder.is_zero) {
                remainder.iclr();
                break;
            }

            offset_x = remainder.deg.x - deg.right.x;
            offset_y = remainder.deg.x - deg.right.y;
        }

        return [quotient, remainder];
    }    

    cubed = () => this.pow(3);
    squared = () => this.pow(2);
    pow = (exponent) => this.constructor._raiseToPower(this, exponent);
    ipow = (exponent) => this.constructor._raiseToPower(this, exponent, this);
    static _raiseToPower(bi_polynumber, exponent, product=null) {
        if (!(product instanceof this))
            product = new this();

        switch (exponent) {
            case 0: return product.irep(1);
            case 1: return product.irep(bi_polynumber);
        }

        product.irep(bi_polynumber);
        for (let e = 1; e < exponent; e++)
            product.imul(bi_polynumber);

        return product;
    }
    
    // evaluatedAt(num) {
    //     switch (this.deg) {
    //         case DEGREE.Undefined: return 0;
    //         case DEGREE.Number: return this.array[0];
    //         case DEGREE.Linear: return this.array[0] + this.array[1] * num;
    //     }
    //
    //     let result = this.array[0] + this.array[1] * num;
    //     for (const i = 2; i <= this.deg; i++)
    //         result += this.array[i] * pow(num, i);
    //
    //     return result;
    // }
    //
    // evaluatedToZero() {
    //     switch (this.deg) {
    //         case DEGREE.Linear: return -this.array[0] / this.array[1];
    //         case DEGREE.Quadratic: {
    //             const a = this.array[2];
    //             const b = this.array[1];
    //             const c = this.array[0];
    //
    //             const two_a = 2 * a;
    //             const sqrt_of__b_squared_minus_4ac = sqrt(sqr(b) - 4*a*c);
    //
    //             return [
    //                 (-b + sqrt_of__b_squared_minus_4ac) / two_a,
    //                 (-b - sqrt_of__b_squared_minus_4ac) / two_a
    //             ];
    //         }
    //     }
    // }
    static _sumDegrees(degrees) {
        const result = {x: 0, y: 0};

        for (const degree of degrees) {
            result.x += degree.x;
            result.y += degree.y;
        }

        return result;
    }
    static _getProductPaths(factor_degrees) {
        const deg = this._sumDegrees(factor_degrees);
        const x_path = Array(factor_degrees.length);
        const y_path = Array(factor_degrees.length);
        const paths = grid3D(deg.x + 1, deg.y + 1, 0);
        const last = factor_degrees.length - 1;
        
        function findProductPath(f) {
            const f_deg = factor_degrees[f];
            let x;
            let y;

            for (let fx = 0; fx <= f_deg.x; fx++) {
                for (let fy = 0; fy <= f_deg.y; fy++) {
                    x_path[f] = fx;
                    y_path[f] = fy;

                    if (f === last) {
                        x = sum(x_path);
                        y = sum(y_path);
                        if (x <= deg.x && y <= deg.y)
                            paths[x][y].push(zip(x_path, y_path));
                    } else
                        findProductPath(f + 1);
                }
            }
        }
        findProductPath(0);

        return paths;
    }
}
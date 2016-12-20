enum Cell {BLOCK, SPACE, UNDEFINED};

declare type Clue = {
    value: number,
    minstart: number,
    maxend: number
};

declare type Field = {
    length: number,
    start: number,
    end: number
};

export default class Nonogram
{
    private dim: number[] = []; //[0 = x_dim, 1 = y_dim]
    //private y_dim: number;
    private transposed: number; //[0 = not transposed, 1 = transposed]
    private clues: Clue[][][] = []; //[transposed (0 = x_clues, 1 = y_clues), index, clue_number]
    //private y_clues: Clue[][];
    private board: Cell[][] = [];
    private unsolved_rows: number[] = [];
    private unsolved_cols: number[] = [];
    private solved: boolean;



    public constructor(level: string)
    {
        let json = require(level);
        this.dim[0] = json.level.x_dim;
        this.dim[1] = json.level.y_dim;

        this.board = [];
        this.clues = [];//json.level.x_clues;
        this.clues[0] = [];
        this.clues[1] = [];
        //this.y_clues = [];//json.level.y_clues;
        this.solved = false;
        this.transposed = 0;
        for(let i = 0; i< this.dim[1]; i++) this.unsolved_rows[i] = i;
        for(let i = 0; i< this.dim[0]; i++) this.unsolved_cols[i] = i;

        //clues inizialization
        for(let T = 0; T < 2; T++)
        {
            for (let i = 0; i < this.dim[1-T]; i++)
            {
                this.clues[T][i] = [];
                let left_clues_sum = 0;
                let right_clues_sum = 0;
                for (let j = 0; j < json.level.x_clues.length; j++)
                {
                    right_clues_sum += json.level.x_clues[i][j] + 1;
                }

                for (let j = 0; j < json.level.x_clues.length; j++)
                {
                    this.clues[T][i][j] = {value: 0, minstart: 0, maxend: 0};
                    this.clues[T][i][j].value = json.level.x_clues[i][j];
                    right_clues_sum -= this.clues[T][i][j].value + 1;
                    this.clues[T][i][j].minstart = left_clues_sum;
                    this.clues[T][i][j].maxend = this.dim[T] - 1 - right_clues_sum;
                    left_clues_sum += this.clues[T][i][j].value + 1;
                }
            }
        }

        for(let i = 0; i < this.dim[1]; i++)
        {
            this.board[i] = [];
            for(let j = 0; j < this.dim[0]; j++)
            {
                this.board[i][j] = Cell.UNDEFINED;
                for(let block of json.level.blocks)
                {
                    if(block.x == j && block.y == i)
                        this.board[i][j] = Cell.BLOCK;
                }
                for(let space of json.level.spaces)
                {
                    if(space.x == j && space.y == i)
                        this.board[i][j] = Cell.SPACE;
                }
            }
        }

        console.log('[Solver] Level file loaded.');
    }

    public show()
    {
        let solution_x_dim = this.dim[0];
        let solution_y_dim = this.dim[1];
        let solution = this.board;
        if(this.transposed)
        {
            solution = solution[0].map((col, i) => {
                return solution.map((row) => {
                    return row[i]
                })
            });
            solution_x_dim = this.dim[1];
            solution_y_dim = this.dim[0];
        }

        for(let j = 0; j < solution_y_dim; j++)
        {
            for(let i = 0; i < solution_x_dim; i++)
            {
                switch(solution[j][i])
                {
                    case Cell.UNDEFINED:
                    {
                        process.stdout.write('□ ');
                        break;
                    }
                    case Cell.BLOCK:
                    {
                        process.stdout.write('■ ');
                        break;
                    }
                    case Cell.SPACE:
                    {
                        process.stdout.write('x ');
                        break;
                    }
                }
            }
            console.log('');
        }

        console.log('');
    }

    /*
    public solve()
    {
        console.log('[Solver] Started solving puzzle...');

        this._solve_boxes();
        for(let i = 0; this.unsolved_rows.length > 0 && this.unsolved_cols.length > 0 && i < 100; i++)
        {
            console.log(i.toString(),'-th iteration');
            this._solve_spaces();
            this._check_and_fill();
            this._solve_force();
            this._check_and_fill();
        }
    }

    public _check_and_fill()
    {
        console.log('[Solver] Checking...');
        for (let i = 0; i < this.unsolved_rows.length; i++)
        {
            let block_count: number = 0;
            let clue_count: number = 0;
            for(let j = 0; j < this.x_dim; j++)
                if(this.board[this.unsolved_rows[i]][j] == Cell.BLOCK) block_count++;

            for(let j = 0; j < this.clues[0][this.unsolved_rows[i]].length; j++)
                clue_count += this.clues[0][this.unsolved_rows[i]][j].value;

            if (clue_count == block_count)
            {
                for(let j = 0; j < this.x_dim; j++)
                    if(this.board[this.unsolved_rows[i]][j] == Cell.UNDEFINED) this.board[this.unsolved_rows[i]][j] = Cell.SPACE;

                this.unsolved_rows.splice(i, 1);
            }

        }
        this._transpose();

        for (let i = 0; i < this.unsolved_cols.length; i++)
        {
            let block_count: number = 0;
            let clue_count: number = 0;
            for(let j = 0; j < this.y_dim; j++)
                if(this.board[this.unsolved_cols[i]][j] == Cell.BLOCK) block_count++;

            for(let j = 0; j < this.y_clues[this.unsolved_cols[i]].length; j++)
                clue_count += this.y_clues[this.unsolved_cols[i]][j].value;

            if (clue_count == block_count)
            {
                for(let j = 0; j < this.y_dim; j++)
                    if(this.board[this.unsolved_cols[i]][j] == Cell.UNDEFINED) this.board[this.unsolved_cols[i]][j] = Cell.SPACE;

                this.unsolved_cols.splice(i, 1);
            }
        }

        this._transpose();
        this.show();
    }


    public _solve_boxes()
    {
        console.log('[Solver] Applying boxes algorithm...');
        for (let i = 0; i < this.unsolved_rows.length; i++)
            this._simple_boxes(this.unsolved_rows[i], this.x_clues[this.unsolved_rows[i]]);

        this._transpose();

        for (let i = 0; i < this.unsolved_cols.length; i++)
            this._simple_boxes(this.unsolved_cols[i], this.y_clues[this.unsolved_cols[i]]);

        this._transpose();
        this.show();
    }

    public _simple_boxes(index: number, clues: Clue[])
    {
        this._overlapping_parts(index, 0, this.x_dim - 1, clues);
    }

    public _solve_spaces()
    {
        console.log('[Solver] Applying spaces algorithm...');
        for (let i = 0; i < this.unsolved_rows.length; i++)
            this._simple_spaces(this.unsolved_rows[i], this.x_clues[this.unsolved_rows[i]]);

        this._transpose();

        for (let i = 0; i < this.unsolved_cols.length; i++)
            this._simple_spaces(this.unsolved_cols[i], this.y_clues[this.unsolved_cols[i]]);

        this._transpose();
        this.show();
    }

    public _simple_spaces(index: number, clues: Clue[])
    {
        let min_field: number = 0;
        let max_field: number = this.x_dim - 1;
        let left_unaccounted_clue: number = 0;
        let right_unaccounted_clue: number = clues.length - 1;

        // Left search
        let found: boolean = true;
        while (found && left_unaccounted_clue < clues.length && min_field < this.x_dim)
        {
            let i = min_field;
            let space_field_count = 0;
            let block_field_count = 0;
            found = false;

            while(i < this.x_dim && this.board[index][i] != Cell.BLOCK)
            {
                i++;
                space_field_count++;
            }

            while(i < this.x_dim && this.board[index][i] == Cell.BLOCK)
            {
                i++;
                block_field_count++;
            }

            if(space_field_count < clues[left_unaccounted_clue].value)
            {
                let block_extension = clues[left_unaccounted_clue].value - block_field_count;
                let space_extension = min_field + space_field_count - block_extension;

                for(let j = min_field; j < space_extension; j++)
                    this.board[index][j] = Cell.SPACE;

                min_field = i + block_extension;
                if(block_extension == 0)
                {
                    this.board[index][i] = Cell.SPACE;
                    min_field++;
                }
                left_unaccounted_clue++;
                found = true;
            }
        }

        //Right search
        found = true;
        while (found && right_unaccounted_clue > -1 && max_field > -1)
        {
            let i = max_field;
            let space_field_count = 0;
            let block_field_count = 0;
            found = false;

            while(i > -1 && this.board[index][i] != Cell.BLOCK)
            {
                i--;
                space_field_count++;
            }

            while(i > -1 && this.board[index][i] == Cell.BLOCK)
            {
                i--;
                block_field_count++;
            }

            if(space_field_count < clues[right_unaccounted_clue].value)
            {
                let block_extension = clues[right_unaccounted_clue].value - block_field_count;
                let space_extension = max_field + 1 - space_field_count + block_extension;

                for(let j = space_extension; j < max_field; j++)
                    this.board[index][j] = Cell.SPACE;

                max_field = i - block_extension;
                if(block_extension == 0)
                {
                    this.board[index][i] = Cell.SPACE;
                    max_field--;
                }
                right_unaccounted_clue--;
                found = true;
            }
        }
    }

    public _solve_force()
    {
        console.log('[Solver] Applying force algorithm...');
        for (let i = 0; i < this.unsolved_rows.length; i++)
            this._force(this.unsolved_rows[i], this.x_clues[this.unsolved_rows[i]]);

        this._transpose();

        for (let i = 0; i < this.unsolved_cols.length; i++)
            this._force(this.unsolved_cols[i], this.y_clues[this.unsolved_cols[i]]);

        this._transpose();
        this.show();
    }

    public _force(index: number, clues: Clue[])
    {
        let found: boolean = true;
        let left_unaccounted_clue: number = 0;
        let available_fields = this._split_by_spaces(index);
        for (let field_index = 0; field_index < available_fields.length; field_index++)
        {
            let univocal_clues: Clue[] = [];
            let fields_to_be_accounted: number = clues[left_unaccounted_clue].value;
            while(found && available_fields[field_index].length >= fields_to_be_accounted && left_unaccounted_clue < clues.length)
            {
                found = false;
                let univocal: boolean = !this._clues_fit_problem(index, available_fields.slice(field_index + 1), clues.slice(left_unaccounted_clue));
                if(univocal)
                {
                    found = true;
                    univocal_clues.push(clues[left_unaccounted_clue]);
                    left_unaccounted_clue++;
                    if(left_unaccounted_clue < clues.length) fields_to_be_accounted += 1 + clues[left_unaccounted_clue].value;
                }
            }
            this._overlapping_parts(index, available_fields[field_index].start, available_fields[field_index].end,  univocal_clues);
        }

    }
    */

    public _overlapping_parts(index: number)
    {
        for(let i = 0; i < this.clues[this.transposed][index].length; i++)
        {
            for(let j = this.clues[this.transposed][index][i].maxend + 1 - this.clues[this.transposed][index][i].value;
                j < this.clues[this.transposed][index][i].minstart + this.clues[this.transposed][index][i].value; j++)
                this.board[index][j] = Cell.BLOCK;
        }
    }

    //region UTILITIES
    public _analyse(index: number)
    {
        let split_fields: Field[] = this._split_by_spaces(index);

        //Analyse split_fields from LEFT
        let current_clue: number = 0;
        let current_split_field: number = 0;
        let available_length: number = split_fields[current_split_field].length;
        let univocal: boolean = true;
        while (univocal && current_clue < this.clues[this.transposed][index].length && current_split_field < split_fields.length)
        {
            //skip the split_fields in which the current_clue doesn't fit
            while(available_length < this.clues[this.transposed][index][current_clue].value && current_split_field < split_fields.length)
            {
                if (available_length == split_fields[current_split_field].length)
                    this._fill_field(index, split_fields[current_split_field], Cell.SPACE);
                current_split_field++;
            }
            // if(current_split_field == split_fields.length) IMPOSSIBLE!!!

            if (this.clues[this.transposed][index][current_clue].minstart < split_fields[current_split_field].start)
                this.clues[this.transposed][index][current_clue].minstart = split_fields[current_split_field].start;

            univocal = (current_split_field == split_fields.length - 1) || !this._clues_fit_problem(index, split_fields.slice(current_split_field + 1), this.clues[this.transposed][index].slice(current_clue));
            if (univocal)
            {
                available_length -= this.clues[this.transposed][index][current_clue].value + 1;
                if (this.clues[this.transposed][index][current_clue].maxend > split_fields[current_split_field].end)
                    this.clues[this.transposed][index][current_clue].maxend = split_fields[current_split_field].end;

                current_clue++;
            }
        }

        //Analyse split_fields from RIGHT
        current_clue = this.clues[this.transposed][index].length - 1;
        current_split_field = split_fields.length - 1;
        available_length = split_fields[current_split_field].length;
        univocal = true;
        while (univocal && current_clue >= 0 && current_split_field >= 0)
        {
            //skip the split_fields in which the current_clue doesn't fit
            while(available_length < this.clues[this.transposed][index][current_clue].value && current_split_field < split_fields.length)
            {
                if (available_length == split_fields[current_split_field].length)
                    this._fill_field(index, split_fields[current_split_field], Cell.SPACE);
                current_split_field--;
            }
            // if(current_split_field == split_fields.length) IMPOSSIBLE!!!

            if (this.clues[this.transposed][index][current_clue].maxend > split_fields[current_split_field].end)
                this.clues[this.transposed][index][current_clue].maxend = split_fields[current_split_field].end;

            univocal = (current_split_field == 0) || !this._clues_fit_problem(index, split_fields.slice(0, current_split_field - 1), this.clues[this.transposed][index].slice(0, current_clue));
            if (univocal)
            {
                available_length -= this.clues[this.transposed][index][current_clue].value + 1;
                if (this.clues[this.transposed][index][current_clue].minstart < split_fields[current_split_field].start)
                    this.clues[this.transposed][index][current_clue].minstart = split_fields[current_split_field].start;

                current_clue--;
            }
        }

        //Analyse block_fields
        let last_univocal_blockfield_clue: number = -1;
        let last_univocal_blockfield_start: number = 0;

        for(let current_split_field = 0; current_split_field < split_fields.length; current_split_field++)
        {
            let block_fields = this._extract_block_fields(index, split_fields[current_split_field].start, split_fields[current_split_field].end)
            for(let current_block_field = 0; current_block_field < block_fields.length; current_block_field++)
            {
                let possible_clues = this._clues_per_blockfield(index, block_fields[current_block_field]);
                if(possible_clues.length == 1)
                {
                    let univocal_clue_index: number = possible_clues[0];

                    //JOIN!
                    if(univocal_clue_index == last_univocal_blockfield_clue)
                        this._fill_field(index, {length: block_fields[current_block_field].end - last_univocal_blockfield_start + 1, start: last_univocal_blockfield_start, end: block_fields[current_block_field].end}, Cell.BLOCK);

                    // Clue range reduction by split_field
                    if (this.clues[this.transposed][index][univocal_clue_index].minstart < split_fields[current_split_field].start)
                        this.clues[this.transposed][index][univocal_clue_index].minstart = split_fields[current_split_field].start;
                    if (this.clues[this.transposed][index][univocal_clue_index].maxend > split_fields[current_split_field].end)
                        this.clues[this.transposed][index][univocal_clue_index].maxend = split_fields[current_split_field].end;

                    // Clue range reduction by block_field extension
                    let extension: number = this.clues[this.transposed][index][univocal_clue_index].value - block_fields[current_block_field].length;

                    if (this.clues[this.transposed][index][univocal_clue_index].minstart < block_fields[current_block_field].start - extension)
                        this.clues[this.transposed][index][univocal_clue_index].minstart = block_fields[current_block_field].start - extension;
                    if (this.clues[this.transposed][index][univocal_clue_index].maxend > block_fields[current_block_field].end + extension)
                        this.clues[this.transposed][index][univocal_clue_index].maxend = block_fields[current_block_field].end + extension;

                    last_univocal_blockfield_clue = univocal_clue_index;
                    last_univocal_blockfield_start = block_fields[current_block_field].start;
                }
            }
        }

    }

    public _fill_field(index: number, field: Field, type: Cell) //doesn't really require a Field, only a start and end...
    {
        for(let i = field.start; i <= field.end; i++)
            this.board[index][i] = type;
    }

    public _clues_per_blockfield(index: number, block_field: Field): number[]
    {
        let possible_clues: number[] = [];
        for (let i = 0; i < this.clues[this.transposed][index].length; i++)
        {
            if(this.clues[this.transposed][index][i].minstart <= block_field.start
                && this.clues[this.transposed][index][i].maxend >= block_field.end
                && this.clues[this.transposed][index][i].value >= block_field.length)
                possible_clues.push(i);
        }
        return possible_clues;
    }

    public _clues_fit_problem(index: number, split_fields: Field[], clues: Clue[]): boolean
    {
        let left_unaccounted_clue: number = 0;
        let fitting_clues_size: number = 0;
        let fits: boolean = true;
        for(let i = 0; i < split_fields.length && left_unaccounted_clue < clues.length; i++)
        {
            fitting_clues_size = clues[left_unaccounted_clue].value;
            while(split_fields[i].length >= fitting_clues_size && left_unaccounted_clue < clues.length)
            {
                left_unaccounted_clue++;
                if(left_unaccounted_clue < clues.length)
                    fitting_clues_size += 1 + clues[left_unaccounted_clue].value;
            }
        }
        if(left_unaccounted_clue < clues.length) fits = false;
        return fits;
    }

    public _extract_block_fields(index: number, start: number, end: number): Field[]
    {
        let block_fields: Field[] = [];
        let blocks_count: number = 0;
        let current_start: number = 0;
        let i: number = start;

        while (i <= end && this.board[index][i] != Cell.BLOCK) i++;

        while (i <= end)
        {
            blocks_count = 0;

            while (i <= end && this.board[index][i] == Cell.BLOCK)
            {
                blocks_count++;
                i++;
            }
            block_fields.push({length: blocks_count, start: current_start, end: i - 1});

            while (i <= end && this.board[index][i] != Cell.BLOCK) i++;

            current_start = i;
        }
        return block_fields;
    }

    public _split_by_spaces(index: number): Field[]
    {
        let split_fields: Field[] = [];
        let available_count: number = 0;
        let current_start: number = 0;
        let i: number = 0;

        while (i < this.dim[this.transposed] && this.board[index][i] == Cell.SPACE) i++;

        while (i < this.dim[this.transposed])
        {
            available_count = 0;

            while (i < this.dim[this.transposed] && this.board[index][i] != Cell.SPACE)
            {
                available_count++;
                i++;
            }
            split_fields.push({length: available_count, start: current_start, end: i - 1});

            while (i < this.dim[this.transposed] && this.board[index][i] == Cell.SPACE) i++;

            current_start = i;
        }
        return split_fields;
    }

    public _transpose()
    {
        // It's a kind of magic
        this.board = this.board[0].map((col, i) => {
            return this.board.map((row) => {
                return row[i]
            })
        });

        /*  //not useful anymore since this.dim[this.transpose] has the same result as the old x_dim
        let tmp = this.dim[0];
        this.dim[0] = this.dim[1];
        this.dim[1] = tmp;
        */
        this.transposed = 1 - this.transposed; // 0 -> 1, 1 -> 0 (like a boolean!)
    }

    //endregion
}

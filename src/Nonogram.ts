enum field {BLOCK, SPACE, UNDEFINED}

declare type Clue = {
    value: number,
    minstart: number,
    maxend: number
}

export default class Nonogram
{
    private x_dim: number;
    private y_dim: number;
    private x_clues: Clue[][];
    private y_clues: Clue[][];
    private board: field[][];
    private unsolved_rows: number[] = [];
    private unsolved_cols: number[] = [];
    private solved: boolean;
    private transposed: boolean;

    public constructor(level: string)
    {
        let json = require(level);
        this.x_dim = json.level.x_dim;
        this.y_dim = json.level.y_dim;

        this.board = [];
        this.x_clues = [];//json.level.x_clues;
        this.y_clues = [];//json.level.y_clues;
        this.solved = false;
        this.transposed = false;
        for(let i = 0; i< this.y_dim; i++) this.unsolved_rows[i] = i;
        for(let i = 0; i< this.x_dim; i++) this.unsolved_cols[i] = i;

        //x_clues inizialization
        for(let i = 0; i < this.y_dim; i++)
        {
            this.x_clues[i] = [];
            let left_clues_sum = 0;
            let right_clues_sum = 0;
            for(let j = 0; j < json.level.x_clues.length; j++)
            {
                right_clues_sum += json.level.x_clues[i][j]+1;
            }

            for(let j = 0; j < json.level.x_clues.length; j++)
            {
                this.x_clues[i][j].value = json.level.x_clues[i][j];
                right_clues_sum -= this.x_clues[i][j].value + 1;
                this.x_clues[i][j].minstart = left_clues_sum;
                this.x_clues[i][j].maxend = this.x_dim - 1 - right_clues_sum;
                left_clues_sum += this.x_clues[i][j].value + 1;
            }
        }

        //y_clues inizialization
        for(let i = 0; i < this.x_dim; i++)
        {
            this.y_clues[i] = [];
            let left_clues_sum = 0;
            let right_clues_sum = 0;
            for(let j = 0; j < json.level.y_clues.length; j++)
            {
                right_clues_sum += json.level.y_clues[i][j]+1;
            }

            for(let j = 0; j < json.level.y_clues.length; j++)
            {
                this.y_clues[i][j].value = json.level.y_clues[i][j];
                right_clues_sum -= this.y_clues[i][j].value + 1;
                this.y_clues[i][j].minstart = left_clues_sum;
                this.y_clues[i][j].maxend = this.y_dim - 1 - right_clues_sum;
                left_clues_sum += this.y_clues[i][j].value + 1;
            }
        }

        for(let i = 0; i < this.y_dim; i++)
        {
            this.board[i] = [];
            for(let j = 0; j < this.x_dim; j++)
            {
                this.board[i][j] = field.UNDEFINED;
                for(let block of json.level.blocks)
                {
                    if(block.x == j && block.y == i)
                        this.board[i][j] = field.BLOCK;
                }
                for(let space of json.level.spaces)
                {
                    if(space.x == j && space.y == i)
                        this.board[i][j] = field.SPACE;
                }
            }
        }

        console.log('[Solver] Level file loaded.');
    }

    public show()
    {
        let solution_x_dim = this.x_dim;
        let solution_y_dim = this.y_dim;
        let solution = this.board;
        if(this.transposed)
        {
            solution = solution[0].map((col, i) => {
                return solution.map((row) => {
                    return row[i]
                })
            });
            solution_x_dim = this.y_dim;
            solution_y_dim = this.x_dim;
        }

        for(let j = 0; j < solution_y_dim; j++)
        {
            for(let i = 0; i < solution_x_dim; i++)
            {
                switch(solution[j][i])
                {
                    case field.UNDEFINED:
                    {
                        process.stdout.write('□ ');
                        break;
                    }
                    case field.BLOCK:
                    {
                        process.stdout.write('■ ');
                        break;
                    }
                    case field.SPACE:
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
                if(this.board[this.unsolved_rows[i]][j] == field.BLOCK) block_count++;

            for(let j = 0; j < this.x_clues[this.unsolved_rows[i]].length; j++)
                clue_count += this.x_clues[this.unsolved_rows[i]][j];

            if (clue_count == block_count)
            {
                for(let j = 0; j < this.x_dim; j++)
                    if(this.board[this.unsolved_rows[i]][j] == field.UNDEFINED) this.board[this.unsolved_rows[i]][j] = field.SPACE;

                this.unsolved_rows.splice(i, 1);
            }

        }
        this._transpose();

        for (let i = 0; i < this.unsolved_cols.length; i++)
        {
            let block_count: number = 0;
            let clue_count: number = 0;
            for(let j = 0; j < this.y_dim; j++)
                if(this.board[this.unsolved_cols[i]][j] == field.BLOCK) block_count++;

            for(let j = 0; j < this.y_clues[this.unsolved_cols[i]].length; j++)
                clue_count += this.y_clues[this.unsolved_cols[i]][j];

            if (clue_count == block_count)
            {
                for(let j = 0; j < this.y_dim; j++)
                    if(this.board[this.unsolved_cols[i]][j] == field.UNDEFINED) this.board[this.unsolved_cols[i]][j] = field.SPACE;

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

    public _simple_boxes(index: number, clues: number[])
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

    public _simple_spaces(index: number, clues: number[])
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

            while(i < this.x_dim && this.board[index][i] != field.BLOCK)
            {
                i++;
                space_field_count++;
            }

            while(i < this.x_dim && this.board[index][i] == field.BLOCK)
            {
                i++;
                block_field_count++;
            }

            if(space_field_count < clues[left_unaccounted_clue])
            {
                let block_extension = clues[left_unaccounted_clue] - block_field_count;
                let space_extension = min_field + space_field_count - block_extension;

                for(let j = min_field; j < space_extension; j++)
                    this.board[index][j] = field.SPACE;

                min_field = i + block_extension;
                if(block_extension == 0)
                {
                    this.board[index][i] = field.SPACE;
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

            while(i > -1 && this.board[index][i] != field.BLOCK)
            {
                i--;
                space_field_count++;
            }

            while(i > -1 && this.board[index][i] == field.BLOCK)
            {
                i--;
                block_field_count++;
            }

            if(space_field_count < clues[right_unaccounted_clue])
            {
                let block_extension = clues[right_unaccounted_clue] - block_field_count;
                let space_extension = max_field + 1 - space_field_count + block_extension;

                for(let j = space_extension; j < max_field; j++)
                    this.board[index][j] = field.SPACE;

                max_field = i - block_extension;
                if(block_extension == 0)
                {
                    this.board[index][i] = field.SPACE;
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

    public _force(index: number, clues: number[])
    {
        let found: boolean = true;
        let left_unaccounted_clue: number = 0;
        let available_fields = this._split_by_spaces(index);
        for (let field_index = 0; field_index < available_fields.length; field_index++)
        {
            let univocal_clues: number[] = [];
            let fields_to_be_accounted = clues[left_unaccounted_clue];
            while(found && available_fields[field_index].length >= fields_to_be_accounted && left_unaccounted_clue < clues.length)
            {
                found = false;
                let univocal: boolean = !this._clues_fit_problem(index, available_fields.slice(field_index + 1), clues.slice(left_unaccounted_clue));
                if(univocal)
                {
                    found = true;
                    univocal_clues.push(clues[left_unaccounted_clue]);
                    left_unaccounted_clue++;
                    if(left_unaccounted_clue < clues.length) fields_to_be_accounted += 1 + clues[left_unaccounted_clue];
                }
            }
            this._overlapping_parts(index, available_fields[field_index].start, available_fields[field_index].end,  univocal_clues);
        }

    }

    //region UTILITIES
    public _clues_fit_problem(index: number, fields: {length: number, start: number, end: number}[], clues: number[]): boolean
    {
        // TODO: Consider actual block fields in the row (right sub-problem)!
        let left_unaccounted_clue: number = 0;
        let fitting_clues_size: number = 0;
        let fits: boolean = true;
        for(let i = 0; i < fields.length && left_unaccounted_clue < clues.length; i++)
        {
            fitting_clues_size = clues[left_unaccounted_clue];
            while(fields[i].length >= fitting_clues_size && left_unaccounted_clue < clues.length)
            {
                left_unaccounted_clue++;
                if(left_unaccounted_clue < clues.length)
                    fitting_clues_size += 1 + clues[left_unaccounted_clue];
            }
        }
        if(left_unaccounted_clue < clues.length) fits = false;
        return fits;
    }


    public _split_by_spaces(index: number): {length: number, start: number, end: number}[]
    {
        let available_fields: {length: number, start: number, end: number}[] = [];
        let available_count: number = 0;
        let current_start: number = 0;
        let i = 0;
        while (i < this.x_dim)
        {
            available_count = 0;
            while (i < this.x_dim && this.board[index][i] != field.SPACE)
            {
                available_count++;
                i++;
            }
            available_fields.push({length: available_count, start: current_start, end: i - 1});

            while (i < this.x_dim && this.board[index][i] == field.SPACE) i++;

            current_start = i;
        }
        return available_fields;
    }

    public _transpose()
    {
        // It's a kind of magic
        this.board = this.board[0].map((col, i) => {
            return this.board.map((row) => {
                return row[i]
            })
        });

        let tmp = this.x_dim;
        this.x_dim = this.y_dim;
        this.y_dim = tmp;

        this.transposed = !this.transposed;
    }

    public _overlapping_parts(index: number, start: number, end: number, clues: number[])
    {
        for(let i = 0; i < clues.length; i++)
        {
            let min_field: number = start + i;
            let max_field: number = end + 1 - (clues.length - 1 - i);

            for(let j = 0; j < i; j++)
                min_field += clues[j];

            for(let j = i + 1; j < clues.length; j++)
                max_field -= clues[j];

            let spaces = max_field - min_field - clues[i];

            for(let j = min_field + spaces; j < max_field - spaces; j++)
                this.board[index][j] = field.BLOCK;
        }
    }

    //endregion
}

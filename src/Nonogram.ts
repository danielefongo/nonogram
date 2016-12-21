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
    public iteration: number;
    public debug_line: number = -1;//14;
    public debug_iteration: number = -1;//3;

    public transposed: number; //[0 = not transposed, 1 = transposed]
    public dim: number[]; //[0 = x_dim, 1 = y_dim]
    public clues: Clue[][][]; //[transposed (0 = x_clues, 1 = y_clues), index, clue_number]
    public board: Cell[][];
    public unsolved: number[][]; // [transposed(0 = rows, 1 = cols), index]

    public constructor(level: string)
    {
        let json = require(level);

        this.transposed = 0;

        this.dim = [];
        this.dim[0] = json.level.x_dim;
        this.dim[1] = json.level.y_dim;

        this.clues = [];
        this.clues[0] = [];
        this.clues[1] = [];

        this.board = [];

        this.unsolved = []
        this.unsolved[0] = [];
        this.unsolved[1] = [];
        for(let i = 0; i < this.dim[1]; i++) this.unsolved[0][i] = i;
        for(let i = 0; i < this.dim[0]; i++) this.unsolved[1][i] = i;

        //clues inizialization
        for(let T = 0; T < 2; T++)
        {
            for (let i = 0; i < this.dim[1-T]; i++)
            {
                this.clues[T][i] = [];
                let left_clues_sum = 0;
                let right_clues_sum = 0;
                for (let j = 0; j < json.level.clues[T][i].length; j++)
                {
                    right_clues_sum += json.level.clues[T][i][j] + 1;
                }

                for (let j = 0; j < json.level.clues[T][i].length; j++)
                {
                    this.clues[T][i][j] = {value: 0, minstart: 0, maxend: 0};
                    this.clues[T][i][j].value = json.level.clues[T][i][j];
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

    public solve()
    {
        console.log('[Solver] Started solving puzzle...');

        for(this.iteration = 0; this.unsolved[this.transposed].length > 0 && this.iteration < 100; this.iteration++)
        {
            console.log(this.iteration.toString(),'-th iteration / transposed: ',this.transposed);
            let j = 0;
            while(j < this.unsolved[this.transposed].length)
            {
                let index: number = this.unsolved[this.transposed][j];
                this._analyse(index);
                this._simple_blocks(index);
                this._simple_spaces(index);
                if(this._is_completed(index))
                    this.unsolved[this.transposed].splice(j, 1);
                else
                    j++;
            }
            this.show();
            this._transpose();
        }
    }

    public _is_completed(index: number): boolean
    {
        let block_sum: number = 0;
        let clue_sum: number = 0;
        for(let j = 0; j < this.dim[this.transposed]; j++)
            if(this.board[index][j] == Cell.BLOCK) block_sum++;

        for(let j = 0; j < this.clues[this.transposed][index].length; j++)
            clue_sum += this.clues[this.transposed][index][j].value;

        if (clue_sum == block_sum)
        {
            for(let j = 0; j < this.dim[this.transposed]; j++)
                if(this.board[index][j] == Cell.UNDEFINED) this.board[index][j] = Cell.SPACE;
            return true;
        }
        return false;
    }

    public _simple_blocks(index: number)
    {
        for(let i = 0; i < this.clues[this.transposed][index].length; i++)
        {
            for(let j = this.clues[this.transposed][index][i].maxend + 1 - this.clues[this.transposed][index][i].value;
                j < this.clues[this.transposed][index][i].minstart + this.clues[this.transposed][index][i].value; j++)
                this.board[index][j] = Cell.BLOCK;
        }
    }

    public _simple_spaces(index: number)
    {
        let last_clue_maxend: number = 0;

        for(let i = 0; i < this.clues[this.transposed][index].length; i++)
        {
            for(let j = last_clue_maxend; j < this.clues[this.transposed][index][i].minstart; j++)
            {
                this.board[index][j] = Cell.SPACE;
            }
            last_clue_maxend = this.clues[this.transposed][index][i].maxend + 1;
        }

        for(let j = last_clue_maxend; j < this.dim[this.transposed]; j++)
        {
            this.board[index][j] = Cell.SPACE;
        }
    }

    //region UTILITIES
    public _analyse(index: number)
    {
        let split_fields: Field[] = this._split_by_spaces(index);

        if(this.debug_line == index && this.iteration == this.debug_iteration)
        {
            console.log('pre split LEFT');
            console.log(this.clues[this.transposed][index]);
            this.show_line(index);
        }

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
                if(current_split_field < split_fields.length)
                    available_length = split_fields[current_split_field].length;
            }
            // if(current_split_field == split_fields.length) IMPOSSIBLE!!!
            if(current_split_field < split_fields.length)
            {
                if (this.clues[this.transposed][index][current_clue].minstart < split_fields[current_split_field].end + 1 - available_length)
                    this.clues[this.transposed][index][current_clue].minstart = split_fields[current_split_field].end + 1 - available_length;

                //JAVASCRIPTMMMERDA! array.slice(start, end) restituisce un insieme "[start, end)", non "[start, end]" -.-
                univocal = (current_split_field == split_fields.length - 1) || !this._clues_fit_problem(split_fields.slice(current_split_field + 1), this.clues[this.transposed][index].slice(current_clue));
                if (univocal)
                {
                    available_length -= this.clues[this.transposed][index][current_clue].value + 1;
                    if (this.clues[this.transposed][index][current_clue].maxend > split_fields[current_split_field].end)
                        this.clues[this.transposed][index][current_clue].maxend = split_fields[current_split_field].end;

                    current_clue++;
                }
            }
        }

        if(this.debug_line == index && this.iteration == this.debug_iteration)
        {
            console.log('pre split RIGHT');
            console.log(this.clues[this.transposed][index]);
            this.show_line(index);
        }

        //Analyse split_fields from RIGHT
        current_clue = this.clues[this.transposed][index].length - 1;
        current_split_field = split_fields.length - 1;
        available_length = split_fields[current_split_field].length;
        univocal = true;
        while (univocal && current_clue >= 0 && current_split_field >= 0)
        {
            //skip the split_fields in which the current_clue doesn't fit
            while(available_length < this.clues[this.transposed][index][current_clue].value && current_split_field >= 0)
            {
                if (available_length == split_fields[current_split_field].length)
                    this._fill_field(index, split_fields[current_split_field], Cell.SPACE);
                current_split_field--;
                if(current_split_field >= 0)
                    available_length = split_fields[current_split_field].length;
            }
            // if(current_split_field == split_fields.length) IMPOSSIBLE!!!

            if(current_split_field >= 0)
            {
                if (this.clues[this.transposed][index][current_clue].maxend > split_fields[current_split_field].start - 1 + available_length)
                    this.clues[this.transposed][index][current_clue].maxend = split_fields[current_split_field].start - 1 + available_length;

                univocal = (current_split_field == 0) || !this._clues_fit_problem(split_fields.slice(0, current_split_field), this.clues[this.transposed][index].slice(0, current_clue + 1));
                if (univocal)
                {
                    available_length -= this.clues[this.transposed][index][current_clue].value + 1;
                    if (this.clues[this.transposed][index][current_clue].minstart < split_fields[current_split_field].start)
                        this.clues[this.transposed][index][current_clue].minstart = split_fields[current_split_field].start;

                    current_clue--;
                }
            }
        }

        if(this.debug_line == index && this.iteration == this.debug_iteration)
        {
            console.log('pre blocks');
            console.log(this.clues[this.transposed][index]);
            this.show_line(index);
        }

        //Analyse block_fields
        let last_univocal_blockfield_clue: number = -1;
        let last_univocal_blockfield_end: number = 0;
        let is_last_blockfield_univocal: boolean = false;

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
                    if(is_last_blockfield_univocal && univocal_clue_index == last_univocal_blockfield_clue)
                        this._fill_field(index, {length: block_fields[current_block_field].start - last_univocal_blockfield_end + 1, start: last_univocal_blockfield_end, end: block_fields[current_block_field].start}, Cell.BLOCK);

                    //SPLIT!
                    if(is_last_blockfield_univocal && univocal_clue_index != last_univocal_blockfield_clue && last_univocal_blockfield_end == block_fields[current_block_field].start - 2)
                        this.board[index][last_univocal_blockfield_end + 1] = Cell.SPACE;

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
                    last_univocal_blockfield_end = block_fields[current_block_field].end;
                    is_last_blockfield_univocal = true;
                }
                else
                {
                    is_last_blockfield_univocal = false;
                }
            }
        }

        if(this.debug_line == index && this.iteration == this.debug_iteration)
        {
            console.log('post blocks');
            console.log(this.clues[this.transposed][index]);
            this.show_line(index);
            console.log('');
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

    public _clues_fit_problem(split_fields: Field[], clues: Clue[]): boolean
    {
        let current_clue: number = 0;
        let current_split_field: number = 0;

        //if (clues.length == 0) return true;
        //if (split_fields.length == 0) return false;

        let available_length: number = split_fields[current_split_field].length;

        while(current_clue < clues.length && current_split_field < split_fields.length)
        {
            while (current_clue < clues.length && clues[current_clue].value <= available_length)
            {
                available_length -= clues[current_clue].value + 1;
                current_clue++;
            }

            current_split_field++;

            if(current_split_field < split_fields.length)
                available_length = split_fields[current_split_field].length;
        }

        if(current_clue < clues.length)
            return false;

        return true;
    }

    public _extract_block_fields(index: number, start: number, end: number): Field[]
    {
        let block_fields: Field[] = [];
        let blocks_count: number = 0;
        let current_start: number = 0;
        let i: number = start;

        while (i <= end && this.board[index][i] != Cell.BLOCK) i++;
        current_start = i;

        while (i <= end)
        {
            blocks_count = 0;

            while (i <= end && this.board[index][i] == Cell.BLOCK)
            {
                blocks_count++;
                i++;
            }
            if(blocks_count > 0)
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
        current_start = i;

        while (i < this.dim[this.transposed])
        {
            available_count = 0;

            while (i < this.dim[this.transposed] && this.board[index][i] != Cell.SPACE)
            {
                available_count++;
                i++;
            }
            if (available_count > 0)
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

    public show_line(index: number)
    {
        let line_dim = this.dim[this.transposed];

        for(let i = 0; i < line_dim; i++)
        {
            switch(this.board[index][i])
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
                        process.stdout.write('  ');
                        break;
                    }
                }
            }
            console.log('');
        }

        console.log('');
    }

    //endregion
}

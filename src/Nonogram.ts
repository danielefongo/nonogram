enum field {BLOCK, SPACE, UNDEFINED}

export default class Nonogram
{
    private x_dim: number;
    private y_dim: number;
    private x_clues: number[][];
    private y_clues: number[][];
    private board: field[][];
    private solved: boolean;
    private transposed: boolean;

    public constructor(level: string)
    {
        let json = require(level);
        this.x_dim = json.level.x_dim;
        this.y_dim = json.level.y_dim;

        this.board = [];
        this.x_clues = json.level.x_clues;
        this.y_clues = json.level.y_clues;
        this.solved = false;
        this.transposed = false;

        for(let i = 0; i < this.y_dim; i++)
        {
            this.board[i] = [];
            for(let j = 0; j < this.x_dim; j++)
            {
                this.board[i][j] = field.UNDEFINED;
                for(let block of json.level.blocks)
                {
                    if(block.x == i && block.y == j)
                        this.board[i][j] = field.BLOCK;
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
        this._solve_spaces();
    }

    private _solve_boxes()
    {
        console.log('[Solver] Applying boxes algorithm...');
        for (let i = 0; i < this.y_dim; i++)
            this._simple_boxes(i, this.x_clues[i]);

        this._transpose();

        for (let i = 0; i < this.y_dim; i++)
            this._simple_boxes(i, this.y_clues[i]);

        this._transpose();
        this.show();
    }

    private _simple_boxes(index: number, clues: number[])
    {
        for(let i = 0; i < clues.length; i++)
        {
            let min_field: number = i;
            let max_field: number = this.x_dim - (clues.length - 1 - i);

            for(let j = 0; j < i; j++)
                min_field += clues[j];

            for(let j = i + 1; j < clues.length; j++)
                max_field -= clues[j];

            let spaces = max_field - min_field - clues[i];

            for(let j = min_field + spaces; j < max_field - spaces; j++)
                this.board[index][j] = field.BLOCK;
        }
    }

    private _solve_spaces()
    {
        console.log('[Solver] Applying spaces algorithm...');
        for (let i = 0; i < this.y_dim; i++)
            this._simple_spaces(i, this.x_clues[i]);

        this._transpose();

        for (let i = 0; i < this.y_dim; i++)
            this._simple_spaces(i, this.y_clues[i]);

        this._transpose();
        this.show();
    }

    private _simple_spaces(index: number, clues: number[])
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

            // scorro i field spaces/undefined fino a trovare un blocco
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

            // scorro i field spaces/undefined fino a trovare un blocco
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

    //region UTILITIES
    private _transpose()
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
    //endregion
}

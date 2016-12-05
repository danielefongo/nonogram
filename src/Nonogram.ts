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

        for(let i = 0; i < this.x_dim; i++)
        {
            this.board[i] = [];
            for(let j = 0; j < this.y_dim; j++)
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
        let solution = this.board;
        if(this.transposed)
        {
            solution = solution[0].map((col, i) => {
                return solution.map((row) => {
                    return row[i]
                })
            });
        }

        for(let i = 0; i < this.x_dim; i++)
        {
            for(let j = 0; j < this.y_dim; j++)
            {
                switch(solution[i][j])
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
        this.show();
        for(let i = 0; i < this.x_dim; i++)
            this._simple_boxes(i, this.x_clues[i]);

        this.show();
        this._transpose();

        for(let i = 0; i < this.x_dim; i++)
        {
            this._simple_boxes(i, this.y_clues[i]);
        }
        this.show();

        this._transpose();

        for(let i = 0; i < this.x_dim; i++)
            this._simple_spaces(i, this.x_clues[i]);

        this.show();
        this._transpose();

        for(let i = 0; i < this.x_dim; i++)
            this._simple_spaces(i, this.y_clues[i]);

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

    private _simple_spaces(index: number, clues: number[])
    {
        let min_field: number = 0;
        let max_field: number = this.x_dim;
        let left_unaccounted_clue: number = 0;
        let right_unaccounted_clue: number = clues.length - 1;
        let found: boolean;


        let left = () =>
        {
            let i = min_field;
            let field_count = 0;
            found = false;

            // scorro i field spaces/undefined fino a trovare un blocco
            while(this.board[index][i] != field.BLOCK)
            {
                i++;
                field_count++;
            }

            // se non ci sta allora il blocco trovato appartiene al primo clue non accounted
            if(field_count < clues[left_unaccounted_clue])
            {
                field_count = 0;

                // conto quanti neri contigui ci sono
                while(this.board[index][i] == field.BLOCK)
                {
                    i++;
                    field_count++;
                }

                let block_extension = clues[left_unaccounted_clue] - field_count;
                let available_fields = i - min_field;

                if(available_fields > clues[left_unaccounted_clue])
                {
                    // inserisco gli spazi a sinistra
                    for(let j = min_field; j < available_fields - clues[left_unaccounted_clue]; j++)
                        this.board[index][j] = field.SPACE;
                }

                min_field = i + block_extension;

                left_unaccounted_clue++;
                found = true;
            }
            else
            {
                // TODO: implement this
            }

        };

        while(found)
            left();

        function right()
        {
            // TODO: implement this
        }
    }

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
}

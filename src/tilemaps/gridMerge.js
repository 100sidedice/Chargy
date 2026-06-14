export function gridToRects(grid) {
    const rows = grid.length;
    const cols = grid[0].length;

    const visited = Array.from({ length: rows }, () =>
        Array(cols).fill(false)
    );

    const rects = [];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] === 0 || visited[y][x]) {
                continue;
            }

            // Find horizontal run
            let x2 = x;
            while (x2 < cols && grid[y][x2] === 1 && !visited[y][x2]) {
                x2++;
            }

            const w = x2 - x;

            // Try to extend vertically
            let h = 1;

            while (y + h < rows) {
                let canExtend = true;

                for (let i = x; i < x2; i++) {
                    if (grid[y + h][i] === 0 || visited[y + h][i]) {
                        canExtend = false;
                        break;
                    }
                }

                if (!canExtend) {
                    break;
                }

                h++;
            }

            // Mark visited
            for (let yy = y; yy < y + h; yy++) {
                for (let xx = x; xx < x2; xx++) {
                    visited[yy][xx] = true;
                }
            }

            rects.push({
                x: x,
                y: y,
                w: w,
                h: h
            });
        }
    }

    return rects;
}
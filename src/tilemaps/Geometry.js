// fun fact, i've used this collision logic for almost 6 years now. Was actually made for the original version of chargy on khan academy back in 2020.

export default class Geometry { 
    /** Returns true if a point is in a rect */
    static pointInRect(point, rectPos, rectSize) {
        return (
            point.x >= rectPos.x &&
            point.x <= rectPos.x + rectSize.x &&
            point.y >= rectPos.y &&
            point.y <= rectPos.y + rectSize.y
        );
    }
    /** Returns true if 2 rects overlap */
    static rectCollide(posA, sizeA, posB, sizeB) {
        return !(
            posA.x + sizeA.x < posB.x || // A is left of B
            posA.x > posB.x + sizeB.x || // A is right of B
            posA.y + sizeA.y < posB.y || // A is above B
            posA.y > posB.y + sizeB.y    // A is below B
        );
    }

    /** Project polygon onto axis and return [min,max] scalar values */
    static projectPolygon(axis, points) {
        let min = axis.dot(points[0]);
        let max = min;
        for (let i = 1; i < points.length; i++) {
            let p = axis.dot(points[i]);
            if (p < min) min = p;
            if (p > max) max = p;
        }
        return {min, max};
    }


    // Sprite & Tile collision 
    static spriteToTile(pos, vlos, size, tilePos, tileSize, buffer=2, bounciness=0.2) {
        const collided = { top: false, bottom: false, left: false, right: false };

        const newPos = { x: pos.x, y: pos.y };
        const newVlos = { x: vlos.x, y: vlos.y };

        let anyCollision = false;

        // Right side
        if (newPos.x + newVlos.x + size.x >= tilePos.x &&
            newPos.x <= tilePos.x &&
            newPos.y + size.y - buffer > tilePos.y &&
            newPos.y + buffer < tilePos.y + tileSize.y
        ) {
            newPos.x = tilePos.x - size.x;
            newVlos.x *= 0.0001;
            collided.right = true;
            anyCollision = true;
        }

        // Left side
        if (newPos.x + newVlos.x <= tilePos.x + tileSize.x &&
            newPos.x + size.x >= tilePos.x + tileSize.x &&
            newPos.y + size.y - buffer > tilePos.y &&
            newPos.y + buffer < tilePos.y + tileSize.y
        ) {
            newPos.x = tilePos.x + tileSize.x;
            newVlos.x *= 0.0001;
            collided.left = true;
            anyCollision = true;
        }

        // Bottom (floor)
        if (newPos.y + newVlos.y + size.y >= tilePos.y &&
            newPos.y <= tilePos.y &&
            newPos.x + size.x - buffer > tilePos.x &&
            newPos.x + buffer < tilePos.x + tileSize.x
        ) {
            newPos.y = tilePos.y - size.y;
            newVlos.y *= -bounciness;
            collided.bottom = true;
            anyCollision = true;
        }

        // Top (ceiling)
        if (newPos.y + newVlos.y <= tilePos.y + tileSize.y &&
            newPos.y + size.y >= tilePos.y + tileSize.y &&
            newPos.x + size.x - buffer > tilePos.x &&
            newPos.x + buffer < tilePos.x + tileSize.x
        ) {
            newPos.y = tilePos.y + tileSize.y;
            newVlos.y *= -bounciness;
            collided.top = true;
            anyCollision = true;
        }

        // Return false if nothing happened
        if (!anyCollision) {
            return false;
        }

        return { pos: newPos, vlos: newVlos, collided };
    }
}
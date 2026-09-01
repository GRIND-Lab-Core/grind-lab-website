(() => {
    "use strict";

    const canvas = document.getElementById("disaster-runner");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const startScreen = document.getElementById("runner-start-screen");
    const startButton = document.getElementById("runner-start-btn");
    const startTitle = startScreen?.querySelector("h3");
    const startCopy = startScreen?.querySelector("p");

    const distanceEl = document.getElementById("runner-distance");
    const impactsEl = document.getElementById("runner-impacts");
    const shelterEl = document.getElementById("runner-shelter");
    const statusEl = document.getElementById("runner-status");

    const leftButton = document.getElementById("runner-left");
    const rightButton = document.getElementById("runner-right");
    const jumpButton = document.getElementById("runner-jump");

    const ACCENT = "#8bd63c";
    const GOAL_DISTANCE = 1000;
    const MAX_IMPACTS = 4;
    const LANE_COUNT = 3;

    const DEFAULT_TITLE = "Hurricane Evacuation";
    const DEFAULT_COPY =
        "Reach the shelter through storm-damaged streets. Change lanes to avoid flooded pavement and debris, or jump when the road ahead is blocked.";

    const OBSTACLE_TYPES = ["barrel", "puddle", "branch", "debris"];

    let width = 1200;
    let height = 420;
    let dpr = 1;

    let running = false;
    let frameId = null;
    let lastTime = 0;
    let distance = 0;
    let impacts = 0;

    let targetLane = 1;
    let visualLane = 1;

    let jumpHeight = 0;
    let jumpVelocity = 0;

    let obstacles = [];
    let spawnTimer = 0.8;

    let rainOffset = 0;
    let hitFlash = 0;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function horizonY() {
        return height * 0.18;
    }

    function vanishX() {
        return width * 0.5;
    }

    /*
      TRUE ONE-POINT PERSPECTIVE
  
                      vanishing point
                           |
                        ___|___
                       /       \
                      /         \
                     /           \
                    /             \
                   /               \
                  /_________________\
  
      Road edges and lane dividers are straight.
    */

    function perspectiveT(y) {
        const h = horizonY();

        return clamp(
            (y - h) /
            Math.max(1, height - h),
            0,
            1
        );
    }

    function roadHalfWidthAt(y) {
        const t = perspectiveT(y);

        const topHalf = width * 0.045;
        const bottomHalf = width * 0.345;

        return lerp(
            topHalf,
            bottomHalf,
            t
        );
    }

    function roadEdgesAt(y) {
        const half = roadHalfWidthAt(y);

        return {
            left: vanishX() - half,
            right: vanishX() + half
        };
    }

    function laneCenterAt(lane, y) {
        const edges = roadEdgesAt(y);
        const roadWidth = edges.right - edges.left;

        return (
            edges.left +
            roadWidth *
            ((lane + 0.5) / LANE_COUNT)
        );
    }

    function laneDividerAt(divider, y) {
        const edges = roadEdgesAt(y);

        return lerp(
            edges.left,
            edges.right,
            divider / LANE_COUNT
        );
    }

    /*
      progress:
      0 = horizon
      1 = player / foreground
    */

    function progressToY(progress) {
        const h = horizonY();
        const p = clamp(progress, 0, 1);

        return (
            h +
            Math.pow(p, 1.55) *
            (height - h)
        );
    }

    function objectScale(progress) {
        return lerp(
            0.16,
            1.16,
            Math.pow(
                clamp(progress, 0, 1),
                1.18
            )
        );
    }

    function resizeCanvas() {
        const rect =
            canvas.getBoundingClientRect();

        width = Math.max(
            320,
            rect.width || 1200
        );

        height = Math.max(
            260,
            rect.height || 420
        );

        dpr = Math.max(
            1,
            Math.min(
                2,
                window.devicePixelRatio || 1
            )
        );

        canvas.width =
            Math.round(width * dpr);

        canvas.height =
            Math.round(height * dpr);

        ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );

        drawScene();
    }

    function setStatus(message) {
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    function updateHud() {
        if (distanceEl) {
            distanceEl.textContent =
                `${Math.floor(distance)} m`;
        }

        if (impactsEl) {
            impactsEl.textContent =
                `${impacts} / ${MAX_IMPACTS}`;
        }

        if (shelterEl) {
            shelterEl.textContent =
                `${Math.max(
                    0,
                    Math.ceil(
                        GOAL_DISTANCE - distance
                    )
                )} m`;
        }
    }

    function resetGame() {
        running = false;

        distance = 0;
        impacts = 0;

        targetLane = 1;
        visualLane = 1;

        jumpHeight = 0;
        jumpVelocity = 0;

        obstacles = [];
        spawnTimer = 0.75;

        rainOffset = 0;
        hitFlash = 0;

        if (startTitle) {
            startTitle.textContent =
                DEFAULT_TITLE;
        }

        if (startCopy) {
            startCopy.textContent =
                DEFAULT_COPY;
        }

        if (startButton) {
            startButton.innerHTML =
                '<i class="fas fa-play"></i> Start Run';
        }

        updateHud();

        setStatus(
            "Press Start, then use ← → to change lanes and ↑ to jump."
        );

        drawScene();
    }

    function startGame() {
        if (frameId) {
            cancelAnimationFrame(frameId);
        }

        resetGame();

        running = true;

        startScreen?.classList.add(
            "is-hidden"
        );

        setStatus(
            "Reach the shelter. Avoid flooded lanes and storm debris."
        );

        lastTime = performance.now();

        frameId =
            requestAnimationFrame(loop);
    }

    function finishGame(success) {
        running = false;

        startScreen?.classList.remove(
            "is-hidden"
        );

        if (success) {
            if (startTitle) {
                startTitle.textContent =
                    "Shelter Reached";
            }

            if (startCopy) {
                startCopy.textContent =
                    `You reached safety with ${impacts} impact${impacts === 1 ? "" : "s"
                    }. Try again and improve your evacuation route.`;
            }

            setStatus(
                "Evacuation complete — you reached the shelter."
            );
        } else {
            if (startTitle) {
                startTitle.textContent =
                    "Route Blocked";
            }

            if (startCopy) {
                startCopy.textContent =
                    "Four impacts stopped the evacuation. Change lanes earlier or jump over debris and try again.";
            }

            setStatus(
                "Too many impacts — the evacuation route is blocked."
            );
        }

        if (startButton) {
            startButton.innerHTML =
                '<i class="fas fa-rotate-right"></i> Run Again';
        }

        drawScene();
    }

    function moveLane(direction) {
        if (!running) return;

        targetLane = clamp(
            targetLane + direction,
            0,
            LANE_COUNT - 1
        );
    }

    function jump() {
        if (!running) return;
        if (jumpHeight > 1) return;

        jumpVelocity = Math.max(
            430,
            height * 1.18
        );
    }


    function spawnObstacle() {
        const lanes = [0, 1, 2];

        const recent = obstacles.filter(
            obstacle => obstacle.progress < 0.22
        );

        const blocked = new Set(
            recent.map(
                obstacle => obstacle.lane
            )
        );

        const available = lanes.filter(
            lane => !blocked.has(lane)
        );

        const lanePool =
            available.length
                ? available
                : lanes;

        obstacles.push({
            lane:
                lanePool[
                Math.floor(
                    Math.random() *
                    lanePool.length
                )
                ],

            progress: 0.025,

            type:
                OBSTACLE_TYPES[
                Math.floor(
                    Math.random() *
                    OBSTACLE_TYPES.length
                )
                ],

            hit: false
        });
    }


    function update(dt) {
        if (!running) return;

        const seconds = dt / 1000;

        /* -------------------------
           Distance
        ------------------------- */

        distance += seconds * 25.5;


        /* -------------------------
           Rain animation
        ------------------------- */

        rainOffset =
            (
                rainOffset +
                seconds * 230
            ) % 62;


        /* -------------------------
           Impact flash
        ------------------------- */

        hitFlash = Math.max(
            0,
            hitFlash - seconds
        );


        /* -------------------------
           Smooth lane movement
        ------------------------- */

        visualLane +=
            (
                targetLane -
                visualLane
            ) *
            Math.min(
                1,
                seconds * 9
            );


        /* -------------------------
           Jump physics
        ------------------------- */

        if (
            jumpVelocity !== 0 ||
            jumpHeight > 0
        ) {
            jumpHeight +=
                jumpVelocity *
                seconds;

            jumpVelocity -=
                1220 *
                seconds;

            if (jumpHeight <= 0) {
                jumpHeight = 0;
                jumpVelocity = 0;
            }
        }


        /* -------------------------
           Move obstacles
        ------------------------- */

        const speed =
            0.27 +
            Math.min(
                0.13,
                distance / 3200
            );

        for (const obstacle of obstacles) {

            obstacle.progress +=
                seconds * speed;


            /* =========================
               COLLISION DETECTION
            ========================= */

            /*
              Only detect collision when the obstacle
              is physically close to the player's feet.
    
              This prevents an obstacle from being counted
              before it visually reaches the player.
            */

            const collisionCenter = 0.955;
            const collisionTolerance = 0.025;

            const inCollisionZone =
                Math.abs(
                    obstacle.progress -
                    collisionCenter
                ) < collisionTolerance;


            /*
              Use visualLane, not targetLane.
    
              This means collision follows where the
              player actually appears on screen.
            */

            const sameLane =
                Math.abs(
                    visualLane -
                    obstacle.lane
                ) < 0.34;


            /*
              If the player is visibly in the air,
              the obstacle is successfully cleared.
            */

            const highEnough =
                jumpHeight >
                height * 0.04;


            if (
                inCollisionZone &&
                sameLane &&
                !highEnough &&
                !obstacle.hit
            ) {
                obstacle.hit = true;

                impacts += 1;
                hitFlash = 0.19;

                updateHud();

                setStatus(
                    `Impact ${impacts}/${MAX_IMPACTS}. Keep moving — the shelter is still ahead.`
                );

                if (
                    impacts >=
                    MAX_IMPACTS
                ) {
                    finishGame(false);
                    return;
                }
            }
        }


        /* -------------------------
           Remove passed obstacles
        ------------------------- */

        obstacles = obstacles.filter(
            obstacle =>
                obstacle.progress < 1.10
        );


        /* -------------------------
           Spawn new obstacle
        ------------------------- */

        spawnTimer -= seconds;

        if (spawnTimer <= 0) {

            spawnObstacle();

            spawnTimer =
                0.86 +
                Math.random() * 0.58 -
                Math.min(
                    0.18,
                    distance / 2800
                );
        }


        /* -------------------------
           Reach shelter
        ------------------------- */

        if (
            distance >=
            GOAL_DISTANCE
        ) {
            distance = GOAL_DISTANCE;

            updateHud();

            finishGame(true);

            return;
        }


        updateHud();
    }

    function drawScene() {
        ctx.clearRect(
            0,
            0,
            width,
            height
        );

        drawSky();

        drawStormClouds();

        drawDistantCity();

        drawSideTerrain();

        drawSidewalks();

        drawRoad();

        drawPerspectiveBuildings();

        drawTreesAndLamps();

        drawLaneMarkings();

        drawObstacles();

        drawPlayer();

        drawRain();

        drawVignette();

        if (hitFlash > 0) {
            ctx.fillStyle =
                `rgba(232,49,122,${hitFlash * 1.8
                })`;

            ctx.fillRect(
                0,
                0,
                width,
                height
            );
        }
    }

    function drawSky() {
        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                0,
                height
            );

        gradient.addColorStop(
            0,
            "#536671"
        );

        gradient.addColorStop(
            0.50,
            "#7b8991"
        );

        gradient.addColorStop(
            0.501,
            "#94a983"
        );

        gradient.addColorStop(
            1,
            "#7b9072"
        );

        ctx.fillStyle =
            gradient;

        ctx.fillRect(
            0,
            0,
            width,
            height
        );
    }

    function drawStormClouds() {
        const gradient =
            ctx.createRadialGradient(
                width * 0.74,
                height * 0.05,
                8,
                width * 0.74,
                height * 0.05,
                width * 0.42
            );

        gradient.addColorStop(
            0,
            "rgba(23,33,42,.54)"
        );

        gradient.addColorStop(
            1,
            "rgba(23,33,42,0)"
        );

        ctx.fillStyle =
            gradient;

        ctx.fillRect(
            0,
            0,
            width,
            height * 0.52
        );
    }

    function drawDistantCity() {
        const h =
            horizonY();

        const center =
            vanishX();

        const gap =
            width * 0.075;

        const colors = [
            "#71818d",
            "#87937f",
            "#909b83",
            "#687985"
        ];

        [-1, 1].forEach(side => {
            for (
                let i = 0;
                i < 8;
                i++
            ) {
                const buildingWidth =
                    width *
                    (
                        0.019 +
                        (i % 3) * 0.004
                    );

                const buildingHeight =
                    height *
                    (
                        0.075 +
                        (i % 4) * 0.018
                    );

                const offset =
                    gap +
                    i *
                    buildingWidth *
                    1.18;

                const x =
                    side < 0
                        ? center -
                        offset -
                        buildingWidth
                        : center +
                        offset;

                const y =
                    h -
                    buildingHeight;

                ctx.fillStyle =
                    colors[
                    i %
                    colors.length
                    ];

                ctx.fillRect(
                    x,
                    y,
                    buildingWidth,
                    buildingHeight
                );

                drawWindows(
                    x,
                    y,
                    buildingWidth,
                    buildingHeight,
                    0.26
                );
            }
        });
    }

    function drawSideTerrain() {
        const h =
            horizonY();

        const top =
            roadEdgesAt(h);

        const bottom =
            roadEdgesAt(height);

        ctx.fillStyle =
            "#91a47f";

        /* left */

        ctx.beginPath();

        ctx.moveTo(
            0,
            h
        );

        ctx.lineTo(
            top.left,
            h
        );

        ctx.lineTo(
            bottom.left,
            height
        );

        ctx.lineTo(
            0,
            height
        );

        ctx.closePath();

        ctx.fill();

        /* right */

        ctx.beginPath();

        ctx.moveTo(
            top.right,
            h
        );

        ctx.lineTo(
            width,
            h
        );

        ctx.lineTo(
            width,
            height
        );

        ctx.lineTo(
            bottom.right,
            height
        );

        ctx.closePath();

        ctx.fill();
    }

    function drawSidewalks() {
        const h =
            horizonY();

        const top =
            roadEdgesAt(h);

        const bottom =
            roadEdgesAt(height);

        const topOffset =
            width * 0.008;

        const bottomOffset =
            width * 0.055;

        ctx.fillStyle =
            "#778a75";

        /* left */

        ctx.beginPath();

        ctx.moveTo(
            top.left -
            topOffset,
            h
        );

        ctx.lineTo(
            top.left,
            h
        );

        ctx.lineTo(
            bottom.left,
            height
        );

        ctx.lineTo(
            bottom.left -
            bottomOffset,
            height
        );

        ctx.closePath();

        ctx.fill();

        /* right */

        ctx.beginPath();

        ctx.moveTo(
            top.right,
            h
        );

        ctx.lineTo(
            top.right +
            topOffset,
            h
        );

        ctx.lineTo(
            bottom.right +
            bottomOffset,
            height
        );

        ctx.lineTo(
            bottom.right,
            height
        );

        ctx.closePath();

        ctx.fill();

        ctx.strokeStyle =
            "rgba(230,235,222,.55)";

        ctx.lineWidth =
            Math.max(
                1,
                width * 0.0015
            );

        ctx.beginPath();

        ctx.moveTo(
            top.left -
            topOffset,
            h
        );

        ctx.lineTo(
            bottom.left -
            bottomOffset,
            height
        );

        ctx.moveTo(
            top.right +
            topOffset,
            h
        );

        ctx.lineTo(
            bottom.right +
            bottomOffset,
            height
        );

        ctx.stroke();
    }

    function drawRoad() {
        const h =
            horizonY();

        const top =
            roadEdgesAt(h);

        const bottom =
            roadEdgesAt(height);

        const roadGradient =
            ctx.createLinearGradient(
                0,
                h,
                0,
                height
            );

        roadGradient.addColorStop(
            0,
            "#3b4449"
        );

        roadGradient.addColorStop(
            1,
            "#30383d"
        );

        ctx.fillStyle =
            roadGradient;

        ctx.beginPath();

        ctx.moveTo(
            top.left,
            h
        );

        ctx.lineTo(
            top.right,
            h
        );

        ctx.lineTo(
            bottom.right,
            height
        );

        ctx.lineTo(
            bottom.left,
            height
        );

        ctx.closePath();

        ctx.fill();

        ctx.strokeStyle =
            "rgba(238,241,233,.82)";

        ctx.lineWidth =
            Math.max(
                2,
                width * 0.002
            );

        ctx.beginPath();

        ctx.moveTo(
            top.left,
            h
        );

        ctx.lineTo(
            bottom.left,
            height
        );

        ctx.moveTo(
            top.right,
            h
        );

        ctx.lineTo(
            bottom.right,
            height
        );

        ctx.stroke();
    }

    /*
      CLEAN LANE MARKINGS
  
      Only two dividers for three lanes.
      All dash segments sit on straight perspective lines.
    */

    function drawLaneMarkings() {
        const dashBands = [
            [0.16, 0.20],
            [0.25, 0.30],
            [0.36, 0.42],
            [0.49, 0.56],
            [0.63, 0.72],
            [0.79, 0.89]
        ];

        const drift =
            (
                distance *
                0.0011
            ) % 0.13;

        for (
            let divider = 1;
            divider < LANE_COUNT;
            divider++
        ) {
            for (
                const band
                of dashBands
            ) {
                let p1 =
                    band[0] +
                    drift;

                let p2 =
                    band[1] +
                    drift;

                if (p1 > 0.92) {
                    p1 -= 0.78;
                    p2 -= 0.78;
                }

                if (
                    p2 <= 0.05 ||
                    p1 >= 0.92
                ) {
                    continue;
                }

                p1 =
                    clamp(
                        p1,
                        0.055,
                        0.92
                    );

                p2 =
                    clamp(
                        p2,
                        0.06,
                        0.94
                    );

                const y1 =
                    progressToY(p1);

                const y2 =
                    progressToY(p2);

                const x1 =
                    laneDividerAt(
                        divider,
                        y1
                    );

                const x2 =
                    laneDividerAt(
                        divider,
                        y2
                    );

                ctx.strokeStyle =
                    "rgba(244,245,238,.82)";

                ctx.lineWidth =
                    lerp(
                        1.1,
                        4.4,
                        p1
                    );

                ctx.lineCap =
                    "round";

                ctx.beginPath();

                ctx.moveTo(
                    x1,
                    y1
                );

                ctx.lineTo(
                    x2,
                    y2
                );

                ctx.stroke();
            }
        }
    }

    function drawPerspectiveBuildings() {
        const depths = [
            0.18,
            0.31,
            0.46,
            0.63,
            0.79
        ];

        depths.forEach(
            (depth, index) => {
                drawBuilding(
                    -1,
                    depth,
                    index
                );

                drawBuilding(
                    1,
                    depth,
                    index + 2
                );
            }
        );
    }

    function drawBuilding(
        side,
        depth,
        variant
    ) {
        const groundY =
            progressToY(depth);

        const road =
            roadEdgesAt(groundY);

        const buildingWidth =
            lerp(
                width * 0.025,
                width * 0.09,
                depth
            );

        const buildingHeight =
            lerp(
                height * 0.10,
                height * 0.42,
                depth
            );

        const sidewalk =
            lerp(
                width * 0.014,
                width * 0.072,
                depth
            );

        const inner =
            side < 0
                ? road.left -
                sidewalk
                : road.right +
                sidewalk;

        const x =
            side < 0
                ? inner -
                buildingWidth
                : inner;

        const y =
            groundY -
            buildingHeight;

        const colors = [
            "#687c8b",
            "#84917c",
            "#74858e",
            "#939e80"
        ];

        ctx.fillStyle =
            colors[
            variant %
            colors.length
            ];

        const roof =
            buildingWidth *
            0.07 *
            side;

        ctx.beginPath();

        ctx.moveTo(
            x,
            y +
            Math.abs(roof)
        );

        ctx.lineTo(
            x +
            buildingWidth,
            y
        );

        ctx.lineTo(
            x +
            buildingWidth,
            groundY
        );

        ctx.lineTo(
            x,
            groundY
        );

        ctx.closePath();

        ctx.fill();

        drawWindows(
            x,
            y,
            buildingWidth,
            buildingHeight,
            lerp(
                0.18,
                0.45,
                depth
            )
        );
    }

    function drawWindows(
        x,
        y,
        buildingWidth,
        buildingHeight,
        alpha
    ) {
        const columns =
            Math.max(
                2,
                Math.floor(
                    buildingWidth / 25
                )
            );

        const rows =
            Math.max(
                2,
                Math.floor(
                    buildingHeight / 27
                )
            );

        const paddingX =
            buildingWidth * 0.15;

        const paddingY =
            buildingHeight * 0.13;

        const usableWidth =
            buildingWidth -
            paddingX * 2;

        const usableHeight =
            buildingHeight -
            paddingY * 2;

        ctx.fillStyle =
            `rgba(218,225,184,${alpha})`;

        for (
            let row = 0;
            row < rows;
            row++
        ) {
            for (
                let column = 0;
                column < columns;
                column++
            ) {
                const cellWidth =
                    usableWidth /
                    columns;

                const cellHeight =
                    usableHeight /
                    rows;

                ctx.fillRect(
                    x +
                    paddingX +
                    (
                        column +
                        0.31
                    ) *
                    cellWidth,

                    y +
                    paddingY +
                    (
                        row +
                        0.31
                    ) *
                    cellHeight,

                    Math.max(
                        2,
                        cellWidth *
                        0.35
                    ),

                    Math.max(
                        2,
                        cellHeight *
                        0.31
                    )
                );
            }
        }
    }

    function drawTreesAndLamps() {
        const depths = [
            0.26,
            0.43,
            0.60,
            0.76,
            0.89
        ];

        depths.forEach(
            (depth, index) => {
                drawTree(
                    -1,
                    depth,
                    index
                );

                drawTree(
                    1,
                    Math.min(
                        0.93,
                        depth + 0.045
                    ),
                    index + 1
                );

                if (
                    index % 2 === 0
                ) {
                    drawLamp(
                        -1,
                        Math.min(
                            0.91,
                            depth + 0.07
                        )
                    );

                    drawLamp(
                        1,
                        Math.min(
                            0.91,
                            depth + 0.10
                        )
                    );
                }
            }
        );
    }

    function drawTree(
        side,
        progress,
        seed
    ) {
        const y =
            progressToY(progress);

        const road =
            roadEdgesAt(y);

        const offset =
            lerp(
                width * 0.020,
                width * 0.084,
                progress
            );

        const x =
            side < 0
                ? road.left -
                offset
                : road.right +
                offset;

        const scale =
            objectScale(progress) *
            0.66;

        ctx.strokeStyle =
            "#674f3b";

        ctx.lineWidth =
            Math.max(
                1,
                5 * scale
            );

        ctx.beginPath();

        ctx.moveTo(
            x,
            y
        );

        ctx.lineTo(
            x,
            y -
            30 *
            scale
        );

        ctx.stroke();

        ctx.fillStyle =
            seed % 2
                ? "#6b8755"
                : "#748e59";

        ctx.beginPath();

        ctx.arc(
            x,
            y -
            40 *
            scale,
            19 *
            scale,
            0,
            Math.PI * 2
        );

        ctx.arc(
            x -
            12 *
            scale,
            y -
            34 *
            scale,
            13 *
            scale,
            0,
            Math.PI * 2
        );

        ctx.arc(
            x +
            12 *
            scale,
            y -
            35 *
            scale,
            14 *
            scale,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    function drawLamp(
        side,
        progress
    ) {
        const y =
            progressToY(progress);

        const road =
            roadEdgesAt(y);

        const offset =
            lerp(
                width * 0.016,
                width * 0.060,
                progress
            );

        const x =
            side < 0
                ? road.left -
                offset
                : road.right +
                offset;

        const scale =
            objectScale(progress) *
            0.60;

        ctx.strokeStyle =
            "#273139";

        ctx.lineWidth =
            Math.max(
                1,
                3 *
                scale
            );

        ctx.beginPath();

        ctx.moveTo(
            x,
            y
        );

        ctx.lineTo(
            x,
            y -
            62 *
            scale
        );

        ctx.lineTo(
            x +
            side *
            17 *
            scale,
            y -
            62 *
            scale
        );

        ctx.stroke();

        ctx.fillStyle =
            "#c8cdbd";

        ctx.fillRect(
            x +
            side *
            17 *
            scale -
            5 *
            scale,

            y -
            66 *
            scale,

            10 *
            scale,

            6 *
            scale
        );
    }

    function drawObstacles() {
        [...obstacles]
            .sort(
                (a, b) =>
                    a.progress -
                    b.progress
            )
            .forEach(
                obstacle => {
                    const y =
                        progressToY(
                            obstacle.progress
                        );

                    const x =
                        laneCenterAt(
                            obstacle.lane,
                            y
                        );

                    drawObstacle(
                        obstacle.type,
                        x,
                        y,
                        objectScale(
                            obstacle.progress
                        ),
                        obstacle.hit
                    );
                }
            );
    }

    function drawObstacle(
        type,
        x,
        y,
        scale,
        hit
    ) {
        ctx.save();

        ctx.translate(
            x,
            y
        );

        ctx.scale(
            scale,
            scale
        );

        ctx.globalAlpha =
            hit
                ? 0.42
                : 1;

        if (
            type === "barrel"
        ) {
            ctx.fillStyle =
                "#945345";

            ctx.fillRect(
                -10,
                -22,
                20,
                22
            );

            ctx.fillStyle =
                ACCENT;

            ctx.fillRect(
                -12,
                -20,
                24,
                4
            );

            ctx.fillRect(
                -11,
                -8,
                22,
                3
            );
        }

        else if (
            type === "puddle"
        ) {
            ctx.fillStyle =
                "rgba(68,147,180,.78)";

            ctx.beginPath();

            ctx.ellipse(
                0,
                -2,
                28,
                10,
                0,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.strokeStyle =
                "rgba(185,225,239,.72)";

            ctx.lineWidth = 2;

            ctx.beginPath();

            ctx.arc(
                -4,
                -2,
                13,
                0.2,
                2.8
            );

            ctx.stroke();
        }

        else if (
            type === "branch"
        ) {
            ctx.strokeStyle =
                "#594536";

            ctx.lineWidth = 8;

            ctx.lineCap =
                "round";

            ctx.beginPath();

            ctx.moveTo(
                -24,
                -4
            );

            ctx.lineTo(
                18,
                -24
            );

            ctx.moveTo(
                -2,
                -15
            );

            ctx.lineTo(
                13,
                -34
            );

            ctx.stroke();

            ctx.fillStyle =
                "#5e774a";

            ctx.beginPath();

            ctx.arc(
                18,
                -27,
                8,
                0,
                Math.PI * 2
            );

            ctx.arc(
                12,
                -35,
                6,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        else {
            ctx.fillStyle =
                "#746b63";

            ctx.beginPath();

            ctx.moveTo(
                -22,
                0
            );

            ctx.lineTo(
                -14,
                -18
            );

            ctx.lineTo(
                1,
                -12
            );

            ctx.lineTo(
                10,
                -26
            );

            ctx.lineTo(
                24,
                -6
            );

            ctx.lineTo(
                18,
                0
            );

            ctx.closePath();

            ctx.fill();
        }

        ctx.restore();
    }

    function drawPlayer() {
        const y =
            height * 0.865;

        const x =
            laneCenterAt(
                visualLane,
                y
            );

        const scale =
            clamp(
                height / 430,
                0.72,
                1.16
            );

        ctx.save();

        ctx.fillStyle =
            "rgba(0,0,0,.30)";

        ctx.beginPath();

        ctx.ellipse(
            x,
            y + 12,
            22 * scale,
            6 * scale,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.translate(
            x,
            y -
            jumpHeight
        );

        ctx.scale(
            scale,
            scale
        );

        /* legs */

        ctx.strokeStyle =
            "#26333b";

        ctx.lineWidth = 5;

        ctx.lineCap =
            "round";

        ctx.beginPath();

        ctx.moveTo(
            -2,
            -3
        );

        ctx.lineTo(
            -15,
            16
        );

        ctx.moveTo(
            3,
            -2
        );

        ctx.lineTo(
            17,
            13
        );

        ctx.stroke();

        /* arms */

        ctx.strokeStyle =
            "#ad7245";

        ctx.beginPath();

        ctx.moveTo(
            -1,
            -27
        );

        ctx.lineTo(
            -16,
            -12
        );

        ctx.moveTo(
            2,
            -26
        );

        ctx.lineTo(
            18,
            -18
        );

        ctx.stroke();

        /* shirt */

        ctx.fillStyle =
            ACCENT;

        ctx.beginPath();

        ctx.moveTo(
            -8,
            -30
        );

        ctx.lineTo(
            8,
            -30
        );

        ctx.lineTo(
            6,
            -7
        );

        ctx.lineTo(
            -6,
            -7
        );

        ctx.closePath();

        ctx.fill();

        /* head */

        ctx.fillStyle =
            "#ad7245";

        ctx.beginPath();

        ctx.arc(
            0,
            -40,
            7,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }

    function drawRain() {
        ctx.strokeStyle =
            "rgba(221,231,237,.26)";

        ctx.lineWidth = 1.25;

        const spacing = 62;

        for (
            let x = -spacing;
            x <
            width + spacing;
            x += spacing
        ) {
            for (
                let y = -spacing;
                y <
                height + spacing;
                y += spacing
            ) {
                const jitter =
                    (
                        x * 13 +
                        y * 7
                    ) % 31;

                const rainX =
                    x +
                    jitter +
                    rainOffset *
                    0.15;

                const rainY =
                    y +
                    (
                        rainOffset +
                        jitter
                    ) %
                    spacing;

                ctx.beginPath();

                ctx.moveTo(
                    rainX,
                    rainY
                );

                ctx.lineTo(
                    rainX - 9,
                    rainY + 22
                );

                ctx.stroke();
            }
        }
    }

    function drawVignette() {
        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                width,
                0
            );

        gradient.addColorStop(
            0,
            "rgba(12,20,25,.18)"
        );

        gradient.addColorStop(
            0.16,
            "rgba(12,20,25,0)"
        );

        gradient.addColorStop(
            0.84,
            "rgba(12,20,25,0)"
        );

        gradient.addColorStop(
            1,
            "rgba(12,20,25,.18)"
        );

        ctx.fillStyle =
            gradient;

        ctx.fillRect(
            0,
            0,
            width,
            height
        );
    }

    function loop(now) {
        const dt =
            Math.min(
                40,
                now -
                lastTime ||
                16.67
            );

        lastTime = now;

        update(dt);

        drawScene();

        if (running) {
            frameId =
                requestAnimationFrame(loop);
        }
    }

    function handleKeyboard(event) {
        const tag =
            document.activeElement
                ?.tagName
                ?.toLowerCase();

        if (
            [
                "input",
                "textarea",
                "select"
            ].includes(tag)
        ) {
            return;
        }

        if (
            [
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                " "
            ].includes(event.key)
        ) {
            event.preventDefault();
        }

        if (
            event.key ===
            "ArrowLeft"
        ) {
            moveLane(-1);
        }

        if (
            event.key ===
            "ArrowRight"
        ) {
            moveLane(1);
        }

        if (
            event.key ===
            "ArrowUp" ||
            event.key === " "
        ) {
            jump();
        }
    }

    startButton?.addEventListener(
        "click",
        startGame
    );

    leftButton?.addEventListener(
        "click",
        () => moveLane(-1)
    );

    rightButton?.addEventListener(
        "click",
        () => moveLane(1)
    );

    jumpButton?.addEventListener(
        "click",
        jump
    );

    window.addEventListener(
        "keydown",
        handleKeyboard,
        {
            passive: false
        }
    );

    if (
        "ResizeObserver"
        in window
    ) {
        const observer =
            new ResizeObserver(
                resizeCanvas
            );

        observer.observe(canvas);
    } else {
        window.addEventListener(
            "resize",
            resizeCanvas
        );
    }

    resizeCanvas();
    resetGame();
})();
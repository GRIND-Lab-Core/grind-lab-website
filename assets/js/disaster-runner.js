document.addEventListener("DOMContentLoaded", () => {

    const canvas = document.getElementById("disaster-runner");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const startBtn = document.getElementById("runner-start-btn");
    const startScreen = document.getElementById("runner-start-screen");
    const distanceDisplay = document.getElementById("runner-distance");
    const statusDisplay = document.getElementById("runner-status");

    const W = canvas.width;
    const H = canvas.height;

    const GOAL_DISTANCE = 500;


    /* ============================================================
       GAME STATE
    ============================================================ */

    let running = false;

    let playerLane = 1;

    let jumpHeight = 0;
    let jumpVelocity = 0;

    let distance = 0;
    let impacts = 0;

    let obstacles = [];
    let obstacleTimer = 0;

    let roadOffset = 0;

    let windTimer = 0;
    let windWarning = 0;
    let windDirection = null;

    let flashTimer = 0;


    const player = {
        y: H - 85,
        size: 48
    };


    /* ============================================================
       START GAME
    ============================================================ */

    function startGame() {
        startScreen.classList.remove("runner-win");

        running = true;

        playerLane = 1;

        jumpHeight = 0;
        jumpVelocity = 0;

        distance = 0;
        impacts = 0;

        obstacles = [];
        obstacleTimer = 65;

        obstacles.push({
            lane: Math.floor(Math.random() * 3),
            progress: 0.12,
            type: Math.random() < 0.5 ? "debris" : "tree",
            hit: false
        });

        roadOffset = 0;

        windTimer = 0;
        windWarning = 0;
        windDirection = null;

        flashTimer = 0;

        distanceDisplay.textContent = "0 m";

        statusDisplay.textContent =
            "Reach the shelter. Use ← → to change lanes and ↑ to jump.";

        startScreen.classList.add("hidden");
    }


    startBtn.addEventListener("click", startGame);


    /* ============================================================
       KEYBOARD
    ============================================================ */

    window.addEventListener("keydown", (event) => {

        if (!running) return;

        if (
            event.key === "ArrowLeft" ||
            event.key.toLowerCase() === "a"
        ) {

            event.preventDefault();

            playerLane = Math.max(
                0,
                playerLane - 1
            );
        }


        if (
            event.key === "ArrowRight" ||
            event.key.toLowerCase() === "d"
        ) {

            event.preventDefault();

            playerLane = Math.min(
                2,
                playerLane + 1
            );
        }


        if (
            (
                event.key === "ArrowUp" ||
                event.key.toLowerCase() === "w"
            ) &&
            jumpHeight === 0
        ) {

            event.preventDefault();

            jumpVelocity = 12;
        }

    });


    /* ============================================================
       OBSTACLES
    ============================================================ */

    function spawnObstacle() {

        const random = Math.random();

        let type;


        /*
          35% debris
          35% fallen tree
          30% flooded lane
        */

        if (random < 0.35) {

            type = "debris";

        } else if (random < 0.70) {

            type = "tree";

        } else {

            type = "water";

        }


        obstacles.push({

            lane: Math.floor(
                Math.random() * 3
            ),

            progress: 0,

            type,

            hit: false

        });

    }


    /* ============================================================
       WIND GUST
    ============================================================ */

    function updateWind() {

        if (!running) return;


        /*
          Don't start gusts immediately.
        */

        windTimer++;


        /*
          About every 7–10 seconds.
        */

        if (
            windTimer > 430 &&
            windWarning === 0
        ) {

            windDirection =
                Math.random() > 0.5
                    ? "left"
                    : "right";

            windWarning = 90;

            windTimer =
                Math.floor(
                    Math.random() * 120
                );


            if (windDirection === "left") {

                statusDisplay.textContent =
                    "⚠ Strong wind from the east — brace right!";

            } else {

                statusDisplay.textContent =
                    "⚠ Strong wind from the west — brace left!";

            }

        }


        /*
          Countdown before gust.
        */

        if (windWarning > 0) {

            windWarning--;


            if (windWarning === 1) {

                applyWindGust();

            }

        }

    }


    function applyWindGust() {

        /*
          Wind actually moves player one lane.
        */

        if (windDirection === "left") {

            playerLane =
                Math.max(
                    0,
                    playerLane - 1
                );

        } else {

            playerLane =
                Math.min(
                    2,
                    playerLane + 1
                );

        }


        statusDisplay.textContent =
            "💨 A strong gust pushed you sideways.";

    }


    /* ============================================================
       UPDATE GAME
    ============================================================ */

    function update() {

        if (!running) return;


        /* Run forward */

        distance += 0.5;

        distanceDisplay.textContent =
            `${Math.floor(distance)} m`;


        roadOffset += 5;

        if (roadOffset > 55) {
            roadOffset = 0;
        }


        /* Jump */

        if (
            jumpVelocity !== 0 ||
            jumpHeight > 0
        ) {

            jumpHeight += jumpVelocity;

            jumpVelocity -= 0.75;


            if (jumpHeight <= 0) {

                jumpHeight = 0;
                jumpVelocity = 0;

            }

        }


        /* Generate obstacles */

        obstacleTimer++;

        let spawnInterval = 78;

        if (distance > 500) {
            spawnInterval = 68;
        }

        if (distance > 1000) {
            spawnInterval = 58;
        }

        if (obstacleTimer > spawnInterval) {

            spawnObstacle();

            obstacleTimer =
                Math.floor(
                    Math.random() * 18
                );

        }


        /* Move objects toward player */

        obstacles.forEach((obstacle) => {

            obstacle.progress += 0.0075;

        });


        /* Collision */

        obstacles.forEach((obstacle) => {

            if (obstacle.hit) return;


            /* Calculate the obstacle's actual screen position */

            const horizonY = 90;

            const obstacleY =
                horizonY +
                obstacle.progress *
                (H - horizonY);


            /* Only collide when obstacle is actually beside the player */

            const verticalDistance =
                Math.abs(
                    obstacleY - player.y
                );

            const nearPlayer =
                verticalDistance < 26;


            const sameLane =
                obstacle.lane === playerLane;


            if (!nearPlayer || !sameLane) {
                return;
            }


            /*
              Flying debris can be jumped.
              Trees and flooded lanes must be avoided
              by changing lanes.
            */

            if (
                obstacle.type === "debris" &&
                jumpHeight > 38
            ) {
                return;
            }


            obstacle.hit = true;

            impacts++;

            flashTimer = 15;


            if (obstacle.type === "debris") {

                statusDisplay.textContent =
                    "Flying debris hit you. Jump earlier next time.";

            }

            if (obstacle.type === "tree") {

                statusDisplay.textContent =
                    "You hit a fallen tree. Change lanes earlier.";

            }

            if (obstacle.type === "water") {

                statusDisplay.textContent =
                    "You entered a flooded lane. Avoid standing water.";

            }


            if (impacts >= 4) {

                endGame(false);

            }

        });


        /* Remove old obstacles */

        obstacles =
            obstacles.filter(
                obstacle =>
                    obstacle.progress < 1.15 &&
                    !obstacle.hit
            );


        updateWind();


        if (flashTimer > 0) {
            flashTimer--;
        }


        /* Reach shelter */

        if (distance >= GOAL_DISTANCE) {

            endGame(true);

        }

    }


    /* ============================================================
       ROAD GEOMETRY
    ============================================================ */

    function roadXAt(y, side) {

        const horizonY = 82;

        const t =
            Math.max(
                0,
                Math.min(
                    1,
                    (y - horizonY) /
                    (H - horizonY)
                )
            );


        if (side === "left") {

            return (
                W * 0.43 -
                t * W * 0.35
            );

        }


        return (
            W * 0.57 +
            t * W * 0.35
        );

    }


    function laneXAt(lane, y) {

        const left =
            roadXAt(y, "left");

        const right =
            roadXAt(y, "right");

        const width =
            (right - left) / 3;


        return (
            left +
            width * (lane + 0.5)
        );

    }


    /* ============================================================
       HURRICANE SKY
    ============================================================ */

    function drawSky() {

        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                0,
                H * 0.6
            );


        gradient.addColorStop(
            0,
            "#4e5d63"
        );

        gradient.addColorStop(
            0.55,
            "#78888a"
        );

        gradient.addColorStop(
            1,
            "#a8b7ad"
        );


        ctx.fillStyle = gradient;

        ctx.fillRect(
            0,
            0,
            W,
            H
        );


        /* Storm clouds */

        ctx.fillStyle =
            "rgba(42, 52, 55, .45)";


        ctx.beginPath();

        ctx.arc(
            100,
            62,
            75,
            0,
            Math.PI * 2
        );

        ctx.arc(
            210,
            50,
            95,
            0,
            Math.PI * 2
        );

        ctx.arc(
            360,
            65,
            110,
            0,
            Math.PI * 2
        );

        ctx.arc(
            515,
            50,
            90,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }


    /* ============================================================
       CITY
    ============================================================ */

    function drawCity() {

        const buildings = [

            [18, 90, 72, 110],
            [100, 115, 65, 85],
            [175, 75, 85, 130],

            [370, 105, 66, 95],
            [460, 68, 88, 135],
            [560, 112, 55, 90]

        ];


        buildings.forEach(
            ([x, y, w, h], index) => {

                ctx.fillStyle =
                    index % 2 === 0
                        ? "#66756f"
                        : "#78857d";


                ctx.fillRect(
                    x,
                    y,
                    w,
                    h
                );


                ctx.fillStyle =
                    "rgba(210,220,185,.55)";


                for (
                    let wy = y + 15;
                    wy < y + h - 10;
                    wy += 20
                ) {

                    for (
                        let wx = x + 11;
                        wx < x + w - 8;
                        wx += 20
                    ) {

                        ctx.fillRect(
                            wx,
                            wy,
                            6,
                            8
                        );

                    }

                }

            }
        );

    }


    /* ============================================================
       ROAD
    ============================================================ */

    function drawRoad() {

        drawSky();

        drawCity();


        /* Ground */

        ctx.fillStyle = "#7f9774";

        ctx.fillRect(
            0,
            H * 0.38,
            W,
            H
        );


        /* Road */

        ctx.beginPath();

        ctx.moveTo(
            W * 0.43,
            82
        );

        ctx.lineTo(
            W * 0.07,
            H
        );

        ctx.lineTo(
            W * 0.93,
            H
        );

        ctx.lineTo(
            W * 0.57,
            82
        );

        ctx.closePath();


        ctx.fillStyle = "#393f40";

        ctx.fill();


        /* Edges */

        ctx.strokeStyle =
            "rgba(225,230,225,.75)";

        ctx.lineWidth = 4;


        ctx.beginPath();

        ctx.moveTo(
            W * 0.43,
            82
        );

        ctx.lineTo(
            W * 0.07,
            H
        );

        ctx.stroke();


        ctx.beginPath();

        ctx.moveTo(
            W * 0.57,
            82
        );

        ctx.lineTo(
            W * 0.93,
            H
        );

        ctx.stroke();


        /* Moving lane lines */

        for (
            let y = 105 - roadOffset;
            y < H;
            y += 58
        ) {

            if (y < 88) continue;


            const y2 =
                Math.min(
                    y + 26,
                    H
                );


            for (
                let separator = 1;
                separator <= 2;
                separator++
            ) {

                const left1 =
                    roadXAt(
                        y,
                        "left"
                    );

                const right1 =
                    roadXAt(
                        y,
                        "right"
                    );

                const left2 =
                    roadXAt(
                        y2,
                        "left"
                    );

                const right2 =
                    roadXAt(
                        y2,
                        "right"
                    );


                const x1 =
                    left1 +
                    (
                        right1 -
                        left1
                    ) *
                    separator / 3;


                const x2 =
                    left2 +
                    (
                        right2 -
                        left2
                    ) *
                    separator / 3;


                ctx.strokeStyle =
                    "rgba(255,255,255,.65)";

                ctx.lineWidth =
                    1 + y / H * 3;


                ctx.beginPath();

                ctx.moveTo(
                    x1,
                    y
                );

                ctx.lineTo(
                    x2,
                    y2
                );

                ctx.stroke();

            }

        }

    }


    /* ============================================================
       RAIN
    ============================================================ */

    function drawRain() {

        const time =
            Date.now() * 0.4;


        ctx.strokeStyle =
            "rgba(215,235,245,.32)";

        ctx.lineWidth = 1.4;


        for (
            let i = 0;
            i < 55;
            i++
        ) {

            const x =
                (
                    i * 83 +
                    time
                ) % (W + 100) - 50;


            const y =
                (
                    i * 47 +
                    time * 1.5
                ) % H;


            ctx.beginPath();

            ctx.moveTo(
                x,
                y
            );

            ctx.lineTo(
                x - 10,
                y + 23
            );

            ctx.stroke();

        }

    }


    /* ============================================================
       OBSTACLE DRAWING
    ============================================================ */

    function drawObstacle(obstacle) {

        const horizonY = 90;


        const y =
            horizonY +
            obstacle.progress *
            (H - horizonY);


        const x =
            laneXAt(
                obstacle.lane,
                y
            );


        const scale =
            0.3 +
            obstacle.progress *
            1.25;


        /*
          Flying debris
        */

        if (obstacle.type === "debris") {

            ctx.font =
                `${25 * scale}px Arial`;

            ctx.textAlign =
                "center";

            ctx.fillText(
                "🪵",
                x,
                y
            );

        }


        /*
          Fallen tree
        */

        if (obstacle.type === "tree") {

            ctx.save();

            ctx.translate(
                x,
                y
            );

            ctx.rotate(
                -0.18
            );


            ctx.font =
                `${34 * scale}px Arial`;

            ctx.textAlign =
                "center";

            ctx.fillText(
                "🌳",
                0,
                0
            );


            ctx.restore();

        }


        /*
          Flooded lane
        */

        if (obstacle.type === "water") {

            const width =
                45 * scale;

            const height =
                15 * scale;


            ctx.fillStyle =
                "rgba(62,166,210,.75)";


            ctx.beginPath();

            ctx.ellipse(
                x,
                y + 5,
                width,
                height,
                0,
                0,
                Math.PI * 2
            );

            ctx.fill();


            ctx.strokeStyle =
                "rgba(215,245,255,.85)";

            ctx.lineWidth = 2;


            ctx.beginPath();

            ctx.moveTo(
                x - width * 0.7,
                y + 2
            );

            ctx.quadraticCurveTo(
                x,
                y - 5,
                x + width * 0.7,
                y + 2
            );

            ctx.stroke();

        }

    }


    /* ============================================================
       PLAYER
    ============================================================ */

    function drawPlayer() {

        const x =
            laneXAt(
                playerLane,
                player.y
            );


        const y =
            player.y -
            jumpHeight;


        /* Shadow */

        ctx.fillStyle =
            "rgba(0,0,0,.28)";


        ctx.beginPath();

        ctx.ellipse(
            x,
            player.y + 8,
            23,
            7,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.font =
            `${player.size}px Arial`;

        ctx.textAlign =
            "center";


        ctx.fillText(
            "🏃",
            x,
            y
        );

    }


    /* ============================================================
       HUD
    ============================================================ */

    function drawHUD() {

        /*
          Impacts
        */

        ctx.fillStyle =
            "rgba(24,31,32,.72)";

        ctx.fillRect(
            15,
            15,
            145,
            42
        );


        ctx.fillStyle =
            "#ffffff";

        ctx.font =
            "700 12px Arial";

        ctx.textAlign =
            "left";


        ctx.fillText(
            `IMPACTS  ${impacts} / 4`,
            29,
            41
        );


        /*
          Distance remaining
        */

        const remaining =
            Math.max(
                0,
                Math.floor(
                    GOAL_DISTANCE -
                    distance
                )
            );


        ctx.fillStyle =
            "rgba(24,31,32,.72)";


        ctx.fillRect(
            W - 172,
            15,
            157,
            42
        );


        ctx.fillStyle =
            "#ffffff";


        ctx.fillText(
            `SHELTER  ${remaining}m`,
            W - 156,
            41
        );

    }


    /* ============================================================
       WIND WARNING
    ============================================================ */

    function drawWindWarning() {

        if (windWarning <= 0) return;


        const opacity =
            Math.min(
                1,
                windWarning / 30
            );


        ctx.fillStyle =
            `rgba(255, 196, 65, ${0.12 * opacity})`;


        ctx.fillRect(
            0,
            0,
            W,
            H
        );


        ctx.font =
            "700 18px Arial";

        ctx.textAlign =
            "center";


        ctx.fillStyle =
            `rgba(255,255,255,${opacity})`;


        if (windDirection === "left") {

            ctx.fillText(
                "💨  WIND ←",
                W / 2,
                100
            );

        } else {

            ctx.fillText(
                "WIND →  💨",
                W / 2,
                100
            );

        }

    }


    /* ============================================================
       DRAW
    ============================================================ */

    function draw() {

        ctx.clearRect(
            0,
            0,
            W,
            H
        );


        drawRoad();

        obstacles.forEach(
            drawObstacle
        );

        drawPlayer();

        drawRain();

        drawHUD();

        drawWindWarning();


        /*
          Collision flash
        */

        if (flashTimer > 0) {

            ctx.fillStyle =
                `rgba(220,60,60,${flashTimer / 55
                })`;


            ctx.fillRect(
                0,
                0,
                W,
                H
            );

        }

    }


    /* ============================================================
       END GAME
    ============================================================ */

    function endGame(success) {

        running = false;

        startScreen.classList.remove(
            "hidden"
        );


        if (success) {

            startScreen.classList.add("runner-win");

            startScreen.innerHTML = `

        <div class="runner-victory">

            <div class="runner-victory-icon">
                <i class="fas fa-house-medical"></i>
            </div>

            <div class="runner-victory-ribbon">
                <span>EVACUATION COMPLETE</span>
            </div>

            <div class="runner-victory-card">

                <div class="runner-victory-check">
                    <i class="fas fa-check"></i>
                </div>

                <h3>You Reached Safety!</h3>

                <p>
                    You successfully navigated the hurricane
                    and reached the emergency shelter.
                </p>

                <div class="runner-victory-stats">

                    <div>
                        <strong>${Math.floor(distance)} m</strong>
                        <span>Distance</span>
                    </div>

                    <div>
                        <strong>${impacts}</strong>
                        <span>Impact${impacts === 1 ? "" : "s"}</span>
                    </div>

                </div>

                <button id="runner-restart-btn">
                    <i class="fas fa-rotate-right"></i>
                    Run Again
                </button>

            </div>

        </div>

    `;

        } else {

            startScreen.innerHTML = `

        <i class="fas fa-hurricane"></i>

        <h3>Evacuation Failed</h3>

        <p>
          Debris, flooding, and storm damage
          made the route too dangerous.
          Try switching lanes earlier.
        </p>

        <button id="runner-restart-btn">
          <i class="fas fa-rotate-right"></i>
          Try Again
        </button>

      `;

        }


        document
            .getElementById(
                "runner-restart-btn"
            )
            .addEventListener(
                "click",
                resetAfterGame
            );

    }


    function resetAfterGame() {

        location.reload();

    }


    /* ============================================================
       GAME LOOP
    ============================================================ */

    function gameLoop() {

        update();

        draw();

        requestAnimationFrame(
            gameLoop
        );

    }


    draw();

    gameLoop();

});
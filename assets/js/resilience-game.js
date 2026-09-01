(() => {
  "use strict";

  const game = document.querySelector("#resilience-game");
  if (!game) return;

  const mapShell = game.querySelector(".rg-map-shell");
  const hazardButtons = [...game.querySelectorAll(".rg-hazard-btn")];
  const resourceButtons = [...game.querySelectorAll(".rg-resource-btn")];
  const zones = [...game.querySelectorAll(".rg-zone")];

  const counter = game.querySelector(".rg-action-counter");
  const actionsLeft = game.querySelector("#rg-actions-left");
  const statusText = game.querySelector("#rg-map-status-text");
  const hint = game.querySelector("#rg-game-hint");
  const runButton = game.querySelector("#rg-run-disaster");
  const deploymentLayer = game.querySelector("#rg-deployment-layer");
  const results = game.querySelector("#rg-results");
  const playAgain = game.querySelector("#rg-play-again");

  const guidance = game.querySelector("#rg-guidance");
  const guidanceTitle = game.querySelector("#rg-guidance-title");
  const guidanceCopy = game.querySelector("#rg-guidance-copy");
  const guidanceIcon = guidance.querySelector("i");
  const mapPrompt = game.querySelector("#rg-map-prompt");
  const mapPromptText = game.querySelector("#rg-map-prompt-text");
  const hazardInfo = game.querySelector("#rg-hazard-info");
  const hazardInfoTitle = game.querySelector("#rg-hazard-info-title");
  const hazardInfoLine1 = game.querySelector("#rg-hazard-info-line-1");
  const hazardInfoLine2 = game.querySelector("#rg-hazard-info-line-2");
  const planList = game.querySelector("#rg-plan-list");
  const undoButton = game.querySelector("#rg-undo-last");
  const toast = game.querySelector("#rg-toast");

  const MAX_ACTIONS = 3;

  const resourceMeta = {
    barrier: {
      icon: "≋",
      fa: "fa-water-ladder",
      label: "Flood barrier",
      shortLabel: "Barrier",
      cost: 3
    },
    cooling: {
      icon: "❄",
      fa: "fa-snowflake",
      label: "Cooling center",
      shortLabel: "Cooling",
      cost: 2
    },
    shelter: {
      icon: "⌂",
      fa: "fa-house-medical",
      label: "Emergency shelter",
      shortLabel: "Shelter",
      cost: 3
    },
    evacuation: {
      icon: "↗",
      fa: "fa-route",
      label: "Evacuation route",
      shortLabel: "Evacuation",
      cost: 2
    },
    warning: {
      icon: "!",
      fa: "fa-tower-broadcast",
      label: "Early-warning system",
      shortLabel: "Warning",
      cost: 1
    }
  };

  const zoneMeta = {
    riverside: { label: "Riverfront", x: 190, y: 137 },
    hillside: { label: "Highland", x: 382, y: 108 },
    downtown: { label: "Central District", x: 346, y: 235 },
    eastside: { label: "Eastside", x: 540, y: 200 }
  };

  const zoneRisk = {
    flood:     { riverside: 1.00, downtown: .72, eastside: .78, hillside: .24 },
    hurricane: { riverside: .67, downtown: .82, eastside: .92, hillside: .55 },
    heatwave:  { riverside: .58, downtown: .84, eastside: 1.00, hillside: .48 },
    wildfire:  { riverside: .33, downtown: .46, eastside: .72, hillside: 1.00 }
  };

  const vulnerability = {
    riverside: .70,
    hillside: .38,
    downtown: .55,
    eastside: 1.00
  };

  const infrastructureValue = {
    riverside: .58,
    hillside: .42,
    downtown: 1.00,
    eastside: .54
  };

  const baseEffect = {
    barrier:    { flood: 1.00, hurricane: .36, heatwave: .05, wildfire: .05 },
    cooling:    { flood: .10, hurricane: .18, heatwave: 1.00, wildfire: .28 },
    shelter:    { flood: .58, hurricane: .86, heatwave: .46, wildfire: .82 },
    evacuation: { flood: .67, hurricane: .91, heatwave: .25, wildfire: .95 },
    warning:    { flood: .76, hurricane: .80, heatwave: .68, wildfire: .78 }
  };

  const zoneFit = {
    barrier:    { riverside: 1.00, downtown: .68, eastside: .60, hillside: .15 },
    cooling:    { riverside: .58, downtown: .92, eastside: 1.00, hillside: .55 },
    shelter:    { riverside: .72, downtown: .78, eastside: 1.00, hillside: .67 },
    evacuation: { riverside: .67, downtown: .73, eastside: .93, hillside: 1.00 },
    warning:    { riverside: .88, downtown: .90, eastside: 1.00, hillside: .84 }
  };

  const statusCopy = {
    flood: "River levels are rising",
    hurricane: "Storm track is approaching",
    heatwave: "Extreme heat is spreading",
    wildfire: "Fire is moving downslope"
  };

  const hazardLabels = {
    flood: "Flood",
    hurricane: "Hurricane",
    heatwave: "Heatwave",
    wildfire: "Wildfire"
  };

  const hazardAssumptions = {
    flood: {
      title: "River Flood",
      line1: "Flow north → south",
      line2: ""
    },
    hurricane: {
      title: "Storm Track",
      line1: "Motion southwest → northeast",
      line2: ""
    },
    heatwave: {
      title: "Extreme Heat",
      line1: "Highest exposure in Eastside",
      line2: ""
    },
    wildfire: {
      title: "Fire Weather",
      line1: "Wind west → east",
      line2: ""
    }
  };

  const hazardColors = {
    flood: "#3aa7d2",
    hurricane: "#6678e8",
    heatwave: "#f18a3b",
    wildfire: "#e25f35"
  };

  let toastTimer = null;

  let state = {
    hazard: null,
    resource: null,
    deployments: [],
    running: false
  };

  function setGuidance(kind, title, copy, iconClass) {
    guidance.dataset.state = kind;
    guidanceTitle.textContent = title;
    guidanceCopy.textContent = copy;
    guidanceIcon.className = `fas ${iconClass}`;
  }

  function shakeGuidance() {
    guidance.classList.remove("rg-shake");
    void guidance.offsetWidth;
    guidance.classList.add("rg-shake");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 1800);
  }

  function updatePlanList() {
    if (state.deployments.length === 0) {
      planList.innerHTML = '<span class="rg-plan-empty">No actions deployed yet</span>';
      return;
    }

    planList.innerHTML = state.deployments.map(({ zone, resource }) => {
      const r = resourceMeta[resource];
      const z = zoneMeta[zone];
      return `
        <span class="rg-plan-chip">
          <i class="fas ${r.fa}"></i>
          <strong>${r.shortLabel}</strong> → ${z.label}
        </span>
      `;
    }).join("");
  }

  function renderMarkers() {
    deploymentLayer.innerHTML = "";
    const countsByZone = {};

    state.deployments.forEach(({ zone, resource }) => {
      countsByZone[zone] = countsByZone[zone] || 0;
      addMarker(zone, resource, countsByZone[zone]);
      countsByZone[zone] += 1;
    });
  }

  function updateUI() {
    const deployed = state.deployments.length;
    const complete = deployed === MAX_ACTIONS;
    const hasHazard = Boolean(state.hazard);
    const placing = Boolean(state.resource);

    actionsLeft.textContent = `${deployed} / ${MAX_ACTIONS}`;
    counter.classList.toggle("has-actions", deployed > 0);
    counter.classList.toggle("complete", complete);

    hazardButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.hazard === state.hazard);
      btn.disabled = state.running || deployed > 0;
    });

    resourceButtons.forEach(btn => {
      btn.disabled = state.running || !hasHazard || complete;
      btn.classList.toggle("active", btn.dataset.resource === state.resource);
      btn.classList.toggle(
        "rg-already-used",
        state.deployments.some(d => d.resource === btn.dataset.resource)
      );
    });

    undoButton.disabled = state.running || deployed === 0;
    runButton.disabled = state.running || !complete;
    runButton.classList.toggle("rg-ready", complete && !state.running);

    mapShell.classList.toggle("rg-awaiting-placement", placing && !complete);
    mapPrompt.classList.toggle("show", placing && !complete);
    mapPrompt.setAttribute("aria-hidden", placing ? "false" : "true");

    zones.forEach(zone => {
      zone.classList.toggle("rg-zone-target", placing && !complete);
      zone.setAttribute("aria-disabled", placing ? "false" : "true");
    });

    updatePlanList();
  }

  function setHazard(hazard) {
    if (state.running) return;

    if (state.deployments.length > 0) {
      setGuidance(
        "warning",
        "Hazard is locked",
        "Undo your deployed actions before changing the hazard.",
        "fa-lock"
      );
      shakeGuidance();
      return;
    }

    state.hazard = hazard;
    state.resource = null;
    mapShell.dataset.hazard = hazard;
    statusText.textContent = statusCopy[hazard];

    const assumptions = hazardAssumptions[hazard];
    hazardInfoTitle.textContent = assumptions.title;
    hazardInfoLine1.textContent = assumptions.line1;
    hazardInfoLine2.textContent = assumptions.line2;
    hazardInfo.classList.add("is-visible");
    hazardInfo.setAttribute("aria-hidden", "false");

    const statusDot = game.querySelector(".rg-status-dot");
    statusDot.style.background = hazardColors[hazard];
    statusDot.style.boxShadow = `0 0 0 5px ${hazardColors[hazard]}22`;

    setGuidance(
      "choose-action",
      `${hazardLabels[hazard]} selected — now choose one action`,
      "Click a protective action below. Then the map will tell you where to place it.",
      "fa-shield-halved"
    );

    hint.innerHTML =
      '<i class="fas fa-circle-2"></i> Choose one protective action below.';
    updateUI();
  }

  function selectResource(resource) {
    if (!state.hazard) {
      setGuidance(
        "warning",
        "Choose a hazard first",
        "Select Flood, Hurricane, Heatwave, or Wildfire before deploying resources.",
        "fa-triangle-exclamation"
      );
      shakeGuidance();
      return;
    }

    if (state.deployments.length >= MAX_ACTIONS || state.running) return;

    state.resource = resource;
    const meta = resourceMeta[resource];

    setGuidance(
      "place-action",
      `${meta.label} selected`,
      "Click Riverside, Hillside, Downtown, or Eastside on the map to deploy it.",
      "fa-location-dot"
    );

    mapPromptText.textContent = `Place ${meta.shortLabel}: click a community`;
    hint.innerHTML =
      `<i class="fas fa-circle-3"></i> Click a community on the map to place ${meta.label}.`;

    updateUI();
  }

  function addMarker(zoneName, resourceName, index) {
    const svgNS = "http://www.w3.org/2000/svg";
    const { x, y } = zoneMeta[zoneName];
    const offsets = [-19, 0, 19];
    const offset = offsets[index] ?? ((index - 1) * 18);

    const group = document.createElementNS(svgNS, "g");
    group.setAttribute("class", "rg-deployment-marker");
    group.setAttribute("transform", `translate(${x + offset} ${y - 27})`);

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("r", "15");

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("y", "1");
    text.textContent = resourceMeta[resourceName].icon;

    group.append(circle, text);
    deploymentLayer.appendChild(group);
  }

  function deploy(zoneName) {
    if (state.running) return;

    if (!state.hazard) {
      setGuidance(
        "warning",
        "Choose a hazard first",
        "The city cannot plan until a hazard scenario has been selected.",
        "fa-triangle-exclamation"
      );
      shakeGuidance();
      return;
    }

    if (!state.resource) {
      setGuidance(
        "warning",
        "Choose an action before clicking the map",
        "Select Barrier, Cooling, Shelter, Evacuation, or Warning below.",
        "fa-arrow-down"
      );
      shakeGuidance();
      return;
    }

    if (state.deployments.length >= MAX_ACTIONS) return;

    const placedResource = state.resource;
    state.deployments.push({
      zone: zoneName,
      resource: placedResource
    });
    state.resource = null;

    renderMarkers();
    const remaining = MAX_ACTIONS - state.deployments.length;
    const resourceLabel = resourceMeta[placedResource].shortLabel;
    const zoneLabel = zoneMeta[zoneName].label;

    showToast(`${resourceLabel} deployed in ${zoneLabel}`);

    if (remaining > 0) {
      setGuidance(
        "choose-action",
        `${resourceLabel} deployed in ${zoneLabel}`,
        `${remaining} action${remaining === 1 ? "" : "s"} remaining. Choose your next protective action.`,
        "fa-check"
      );
      hint.innerHTML =
        `<i class="fas fa-check-circle"></i> ${remaining} action${remaining === 1 ? "" : "s"} left — choose the next one.`;
    } else {
      setGuidance(
        "ready",
        "Your three-action plan is ready",
        "Review the deployment summary, undo if needed, or run the disaster.",
        "fa-circle-play"
      );
      hint.innerHTML =
        '<i class="fas fa-circle-check"></i> Plan complete — click Run Disaster.';
    }

    updateUI();
  }

  function undoLast() {
    if (state.deployments.length === 0 || state.running) return;

    const removed = state.deployments.pop();
    state.resource = null;
    renderMarkers();

    showToast(
      `${resourceMeta[removed.resource].shortLabel} removed from ${zoneMeta[removed.zone].label}`
    );

    setGuidance(
      "choose-action",
      "Last action removed",
      `${MAX_ACTIONS - state.deployments.length} action${MAX_ACTIONS - state.deployments.length === 1 ? "" : "s"} available. Choose another protective action.`,
      "fa-rotate-left"
    );

    hint.innerHTML =
      '<i class="fas fa-arrow-pointer"></i> Choose a protective action to continue.';
    updateUI();
  }

  function calculateScores() {
    const risk = zoneRisk[state.hazard];
    const protectionByZone = {
      riverside: 0,
      hillside: 0,
      downtown: 0,
      eastside: 0
    };

    let totalProtection = 0;
    let totalCost = 0;

    state.deployments.forEach(({ zone, resource }) => {
      const effectiveness =
        risk[zone] *
        baseEffect[resource][state.hazard] *
        zoneFit[resource][zone];

      protectionByZone[zone] += effectiveness;
      totalProtection += effectiveness;
      totalCost += resourceMeta[resource].cost;
    });

    const weightedLives =
      Object.entries(protectionByZone).reduce((sum, [zone, protection]) => {
        return sum + Math.min(protection, 1.2) *
          (.62 + infrastructureValue[zone] * .38);
      }, 0);

    const vulnerableProtection =
      Object.entries(protectionByZone).reduce((sum, [zone, protection]) => {
        return sum + Math.min(protection, 1.2) * vulnerability[zone];
      }, 0);

    const averageProtection = totalProtection / MAX_ACTIONS;
    const lives = clamp(Math.round(31 + weightedLives * 24), 24, 97);
    const fairness = clamp(Math.round(28 + vulnerableProtection * 27), 20, 98);
    const costEfficiency = clamp(
      Math.round(48 + averageProtection * 34 + (10 - totalCost) * 2.5),
      25,
      96
    );
    const recoveryDays = clamp(
      Math.round(78 - totalProtection * 15 - fairness * .10),
      16,
      74
    );
    const recoveryScore = clamp(Math.round(105 - recoveryDays), 25, 95);

    return {
      lives,
      fairness,
      costEfficiency,
      recoveryDays,
      recoveryScore,
      protectionByZone
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function feedbackFor(scores) {
    const p = scores.protectionByZone;
    const protectedZones = Object.values(p).filter(v => v > .36).length;

    if (p.downtown > .75 && p.eastside < .38) {
      return "You prioritized critical infrastructure in the Central District, but the more vulnerable Eastside remained exposed.";
    }

    if (p.eastside > .68 && scores.fairness >= 70 && scores.lives >= 68) {
      return "Your strategy reduced overall risk while prioritizing the more socially vulnerable Eastside.";
    }

    if (protectedZones >= 3) {
      return "Your strategy distributed protection broadly, improving system-wide resilience despite limited resources.";
    }

    if (scores.costEfficiency >= 78 && scores.fairness < 58) {
      return "Your plan was cost-efficient, but efficiency alone did not produce a fair distribution of protection.";
    }

    if (scores.fairness >= 76 && scores.lives < 62) {
      return "You prioritized fairness, but the selected measures were not fully matched to the hazard.";
    }

    return "Your choices reveal a core resilience challenge: limited resources create trade-offs among protection, fairness, cost, and recovery.";
  }

  function qualitativeLevel(score) {
    if (score >= 75) return { label: "High", width: 90 };
    if (score >= 55) return { label: "Moderate", width: 64 };
    return { label: "Low", width: 36 };
  }

  function recoveryLevel(score) {
    if (score >= 75) return { label: "Faster", width: 90 };
    if (score >= 55) return { label: "Moderate", width: 64 };
    return { label: "Slower", width: 36 };
  }

  function showScores(scores) {
    const livesLevel = qualitativeLevel(scores.lives);
    const fairnessLevel = qualitativeLevel(scores.fairness);
    const costLevel = qualitativeLevel(scores.costEfficiency);
    const recovery = recoveryLevel(scores.recoveryScore);

    const values = {
      lives: livesLevel.width,
      fairness: fairnessLevel.width,
      cost: costLevel.width,
      recovery: recovery.width
    };

    game.querySelector("#rg-score-lives").textContent = livesLevel.label;
    game.querySelector("#rg-score-fairness").textContent = fairnessLevel.label;
    game.querySelector("#rg-score-cost").textContent = costLevel.label;
    game.querySelector("#rg-score-recovery").textContent = recovery.label;
    game.querySelector("#rg-feedback").textContent = feedbackFor(scores);

    requestAnimationFrame(() => {
      Object.entries(values).forEach(([key, value]) => {
        game.querySelector(`#rg-bar-${key}`).style.width = `${value}%`;
      });
    });

    results.classList.add("show");
    results.setAttribute("aria-hidden", "false");
  }

  function runDisaster() {
    if (state.deployments.length !== MAX_ACTIONS || state.running) return;

    state.running = true;
    game.classList.add("rg-running");
    mapShell.classList.add("rg-impact");
    runButton.innerHTML = 'Simulating… <i class="fas fa-spinner fa-spin"></i>';

    setGuidance(
      "ready",
      `${hazardLabels[state.hazard]} is moving through the city`,
      "Your three deployments are now being tested.",
      "fa-spinner"
    );

    const scores = calculateScores();
    updateUI();

    window.setTimeout(() => {
      showScores(scores);
      state.running = false;
      game.classList.remove("rg-running");
      runButton.innerHTML = 'Run Disaster <i class="fas fa-play"></i>';
    }, 2200);
  }

  function resetGame() {
    state = {
      hazard: null,
      resource: null,
      deployments: [],
      running: false
    };

    deploymentLayer.innerHTML = "";
    results.classList.remove("show");
    results.setAttribute("aria-hidden", "true");
    mapShell.classList.remove("rg-impact", "rg-awaiting-placement");
    mapShell.dataset.hazard = "";
    statusText.textContent = "Choose a hazard to begin";
    hazardInfo.classList.remove("is-visible");
    hazardInfo.setAttribute("aria-hidden", "true");
    hazardInfoTitle.textContent = "Scenario context";
    hazardInfoLine1.textContent = "Select a hazard to view its drivers.";
    hazardInfoLine2.textContent = "";

    const statusDot = game.querySelector(".rg-status-dot");
    statusDot.style.background = "#95a79e";
    statusDot.style.boxShadow = "0 0 0 5px rgba(149,167,158,.14)";

    zones.forEach(zone => zone.classList.remove("rg-zone-target"));

    ["lives", "fairness", "cost", "recovery"].forEach(key => {
      game.querySelector(`#rg-bar-${key}`).style.width = "0";
    });

    runButton.innerHTML = 'Run Disaster <i class="fas fa-play"></i>';
    hint.innerHTML =
      '<i class="fas fa-circle-1"></i> Choose a hazard above to start.';

    setGuidance(
      "start",
      "Start here: choose a hazard",
      "The map and protective actions will activate after you select one.",
      "fa-hand-pointer"
    );

    updateUI();
  }

  hazardButtons.forEach(btn => {
    btn.addEventListener("click", () => setHazard(btn.dataset.hazard));
  });

  resourceButtons.forEach(btn => {
    btn.addEventListener("click", () => selectResource(btn.dataset.resource));
  });

  zones.forEach(zone => {
    const choose = () => deploy(zone.dataset.zone);

    zone.addEventListener("click", choose);
    zone.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose();
      }
    });
  });

  runButton.addEventListener("click", runDisaster);
  undoButton.addEventListener("click", undoLast);
  playAgain.addEventListener("click", resetGame);

  resetGame();
})();
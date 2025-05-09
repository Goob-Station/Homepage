document.addEventListener('DOMContentLoaded', () => {
    const goobServerConfigs = [
        { url: "sigma.goobstation.com", displayName: "Sigma" },
        { url: "alpha.goobstation.com", displayName: "Alpha" },
        { url: "beta.goobstation.com", displayName: "Beta" },
        { url: "omega.goobstation.com", displayName: "Omega" },
        { url: "aurum.goobstation.com", displayName: "Aurum" },
        { url: "regalis.goobstation.com", displayName: "Regalis" }
    ];

    const hostedServerConfigs = [
        { url: "server.project-monolith.xyz", displayName: "Project Monolith" }
    ];

    const goobServersContainer = document.getElementById('goob-servers-container');
    const hostedServersContainer = document.getElementById('hosted-servers-container');

    async function fetchServerStatus(serverConfig) {
        const apiUrl = `https://${serverConfig.url}/status`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const error = new Error(`HTTP error! status: ${response.status} for ${serverConfig.url}`);
                error.serverConfig = serverConfig;
                throw error;
            }
            const data = await response.json();
            return { status: 'fulfilled', value: { ...data, serverConfig } };
        } catch (error) {
            console.error(`Failed to fetch status for ${error.serverConfig?.url || serverConfig.url}:`, error.message);
            return { status: 'rejected', reason: { message: error.message, serverConfig: error.serverConfig || serverConfig } };
        }
    }

    function renderErrorCard(serverConfig, container, errorMessage) {
        console.log('[renderErrorCard] Called for:', serverConfig, 'Error:', errorMessage, 'Container:', container);
        const card = document.createElement('div');
        card.className = 'server-card server-card-offline';

        let shortRegion = "OTH";
        if (serverConfig.url.includes("eu")) shortRegion = "EU";
        else if (serverConfig.url.includes("us") || serverConfig.url.includes("am")) shortRegion = "US";
        else if (serverConfig.url.includes("as")) shortRegion = "AS";
        else if (serverConfig.url.includes("oc")) shortRegion = "OC";

        const offlineTitle = serverConfig.displayName || serverConfig.url.split('.')[0];

        card.innerHTML = `
            <div class="card-left-panel">
                <div class="rp-type-large">N/A</div>
                <div class="region-short-large">${shortRegion}</div>
            </div>
            <div class="card-right-panel">
                <div class="server-name-display offline-message">${offlineTitle} - OFFLINE</div>
                <div class="server-error-details"></div>
            </div>
        `;
        container.appendChild(card);
        console.log('[renderErrorCard] Card appended for:', serverConfig.displayName, card);
    }

    function translateRpTag(tags) {
        const rpTag = tags.find(tag => tag.startsWith("rp:"));
        if (!rpTag) return "N/A";
        const level = rpTag.split(":")[1];
        switch (level) {
            case "none": return "NRP";
            case "low": return "LRP";
            case "med": return "MRP";
            case "high": return "HRP";
            default:
                if (level.includes("low")) return "LRP";
                if (level.includes("med")) return "MRP";
                if (level.includes("high")) return "HRP";
                return level.toUpperCase();
        }
    }

    function translateRegionTag(tags) {
        const regionTag = tags.find(tag => tag.startsWith("region:"));
        if (!regionTag) return "N/A";
        const regionCode = regionTag.split(":")[1];
        switch (regionCode) {
            case "eu_w": case "eu_e": return "EU";
            case "ata": return "ATA"; // Antarctica
            case "grl": return "GRL"; // Greenland
            case "am_n_w": case "am_n_c": case "am_n_e": return "NA"; // North America
            case "am_c": return "CA"; // Central America
            case "am_s_s": case "am_s_e": case "am_s_w": return "SA"; // South America
            case "af_n": case "af_c": case "af_s": return "AF"; // Africa
            case "me": return "ME"; // Middle East
            case "as_n": case "as_se": case "as_e": return "AS"; // Asia
            case "ind": return "IN"; // India
            case "oce": return "OC"; // Oceania
            case "luna": return "LUN"; // The Moon
            default: return "OTH"; // Other
        }
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;") 
             .replace(/'/g, "&#039;");
    }

    function renderServerCard(serverData, container) {
        const card = document.createElement('div');
        card.className = 'server-card';

        const serverDisplayName = serverData.serverConfig.displayName;

        const rpLevel = translateRpTag(serverData.tags || []);
        const shortRegion = translateRegionTag(serverData.tags || []);

        card.innerHTML = `
            <div class="card-left-panel">
                <div class="rp-type-large">${rpLevel}</div>
                <div class="region-short-large">${shortRegion}</div>
            </div>
            <div class="card-right-panel">
                <div class="server-name-display">${serverDisplayName}</div>
                <div class="server-stats">
                    <span class="stat-item players">
                        <i class="fas fa-users"></i> ${serverData.players !== undefined ? serverData.players : 'N/A'}${serverData.soft_max_players !== undefined ? '/' + serverData.soft_max_players : ''}
                    </span>
                    <span class="stat-item round-duration-container">
                        <i class="fas fa-clock"></i> <span class="round-duration" data-round-start-time="${serverData.round_start_time || ''}">00:00</span>
                    </span>
                    <span class="stat-item gamemode">
                        <i class="fas fa-cube"></i> ${serverData.preset || 'N/A'}
                    </span>
                    <span class="stat-item round-id">
                        <i class="fas fa-hashtag"></i> ${serverData.round_id || 'N/A'}
                    </span>
                </div>
            </div>
        `;
        container.appendChild(card);
    }

    function updateRoundDurations() {
        const durationElements = document.querySelectorAll('.round-duration');
        durationElements.forEach(el => {
            const startTimeIso = el.dataset.roundStartTime;
            if (!startTimeIso) {
                el.textContent = "N/A";
                return;
            }
            try {
                const startTime = new Date(startTimeIso);
                const now = new Date();
                const diffMs = now - startTime;

                if (isNaN(startTime.getTime()) || diffMs < 0) {
                    el.textContent = "Invalid Time";
                    return;
                }

                let diffS = Math.floor(diffMs / 1000);
                let diffM = Math.floor(diffS / 60);
                let diffH = Math.floor(diffM / 60);

                diffS %= 60;
                diffM %= 60;

                el.textContent = `${String(diffH).padStart(2, '0')}:${String(diffM).padStart(2, '0')}:${String(diffS).padStart(2, '0')}`;
            } catch (e) {
                el.textContent = "Error";
                console.error("Error parsing date for round duration:", startTimeIso, e);
            }
        });
    }

    function getRpSortOrder(rpLevelString) {
        switch (rpLevelString) {
            case "LRP": return 1;
            case "MRP": return 2;
            case "HRP": return 3;
            case "NRP": return 4;
            default: return 5;
        }
    }

    function sortAndRenderServers(serverDataArray, container) {
        container.innerHTML = '';

        serverDataArray.sort((a, b) => {
            const rpLevelA = translateRpTag(a.tags || []);
            const rpLevelB = translateRpTag(b.tags || []);
            const rpOrderA = getRpSortOrder(rpLevelA);
            const rpOrderB = getRpSortOrder(rpLevelB);

            if (rpOrderA !== rpOrderB) {
                return rpOrderA - rpOrderB;
            }
            return (b.players || 0) - (a.players || 0);
        });

        serverDataArray.forEach(serverDataWithValue => {
            renderServerCard(serverDataWithValue, container);
        });
    }

    async function fetchAllStatusesAndProcess(serverConfigs, container) {
        const promises = serverConfigs.map(config => fetchServerStatus(config));
        const results = await Promise.all(promises);

        const successfulServers = [];
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                successfulServers.push(result.value);
            } else {
                renderErrorCard(result.reason.serverConfig, container, result.reason.message);
            }
        });
        sortAndRenderServers(successfulServers, container);
    }

    fetchAllStatusesAndProcess(goobServerConfigs, goobServersContainer);

    fetchAllStatusesAndProcess(hostedServerConfigs, hostedServersContainer);

    setInterval(updateRoundDurations, 1000);
    setTimeout(updateRoundDurations, 200);
});
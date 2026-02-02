/**
 * ai5-marketplaces Documentation Site
 *
 * SECURITY: All DOM manipulation uses textContent and createElement
 * to prevent XSS vulnerabilities. No innerHTML with user data.
 */

let data = null;
let allPacks = [];
let allMCPServers = [];

/**
 * Initialize the application
 */
async function init() {
    try {
        // Load data.json
        const response = await fetch('data.json');
        data = await response.json();

        // Store original data for search
        allPacks = data.packs;
        allMCPServers = data.mcp_servers;

        // Render sections
        renderPacks(allPacks);
        renderMCPServers(allMCPServers);

        // Setup search
        document.getElementById('searchInput').addEventListener('input', handleSearch);

        // Setup modal close handlers
        setupModals();

    } catch (error) {
        console.error('Failed to load data:', error);
        showError('Failed to load documentation data. Please try refreshing the page.');
    }
}

/**
 * Display error message
 */
function showError(message) {
    const main = document.querySelector('main');
    const errorDiv = document.createElement('div');
    errorDiv.style.color = '#ee0000';
    errorDiv.style.padding = '2rem';
    errorDiv.style.textAlign = 'center';
    errorDiv.textContent = `Error: ${message}`;
    main.insertBefore(errorDiv, main.firstChild);
}

/**
 * Render agentic packs grid
 */
function renderPacks(packs) {
    const grid = document.getElementById('packs-grid');
    const count = document.getElementById('packs-count');

    // Clear existing content
    grid.textContent = '';
    count.textContent = `(${packs.length})`;

    if (packs.length === 0) {
        const noResults = document.createElement('p');
        noResults.textContent = 'No packs found matching your search.';
        noResults.style.color = '#d2d2d2';
        grid.appendChild(noResults);
        return;
    }

    packs.forEach(pack => {
        const card = createPackCard(pack);
        grid.appendChild(card);
    });
}

/**
 * Create a pack card (XSS-safe)
 */
function createPackCard(pack) {
    const div = document.createElement('div');
    div.className = 'card pack-card';

    // Pack name
    const h3 = document.createElement('h3');
    h3.textContent = pack.plugin.name || pack.name;
    div.appendChild(h3);

    // Version
    const version = document.createElement('p');
    version.className = 'version';
    version.textContent = `v${pack.plugin.version || '0.0.0'}`;
    div.appendChild(version);

    // Description
    const desc = document.createElement('p');
    desc.className = 'description';
    desc.textContent = pack.plugin.description || 'No description available';
    div.appendChild(desc);

    // Stats
    const stats = document.createElement('div');
    stats.className = 'stats';

    const skillSpan = document.createElement('span');
    skillSpan.textContent = `${pack.skills.length} skill${pack.skills.length !== 1 ? 's' : ''}`;
    stats.appendChild(skillSpan);

    const agentSpan = document.createElement('span');
    agentSpan.textContent = `${pack.agents.length} agent${pack.agents.length !== 1 ? 's' : ''}`;
    stats.appendChild(agentSpan);

    div.appendChild(stats);

    // View button
    const button = document.createElement('button');
    button.textContent = 'View Details';
    button.onclick = () => showPackDetails(pack.name);
    div.appendChild(button);

    return div;
}

/**
 * Render MCP servers grid
 */
function renderMCPServers(servers) {
    const grid = document.getElementById('mcp-grid');
    const count = document.getElementById('mcp-count');

    // Clear existing content
    grid.textContent = '';
    count.textContent = `(${servers.length})`;

    if (servers.length === 0) {
        const noResults = document.createElement('p');
        noResults.textContent = 'No MCP servers found matching your search.';
        noResults.style.color = '#d2d2d2';
        grid.appendChild(noResults);
        return;
    }

    servers.forEach(server => {
        const card = createMCPCard(server);
        grid.appendChild(card);
    });
}

/**
 * Create an MCP server card (XSS-safe)
 */
function createMCPCard(server) {
    const div = document.createElement('div');
    div.className = 'card mcp-card';

    // Server name
    const h3 = document.createElement('h3');
    h3.textContent = server.name;
    div.appendChild(h3);

    // Pack tag
    const packTag = document.createElement('p');
    packTag.className = 'pack-tag';
    packTag.textContent = `Pack: ${server.pack}`;
    div.appendChild(packTag);

    // Container
    const container = document.createElement('p');
    container.className = 'container';
    container.textContent = `Container: ${server.command}`;
    div.appendChild(container);

    // Environment variables
    const envVars = document.createElement('div');
    envVars.className = 'env-vars';
    envVars.textContent = server.env.length > 0
        ? `${server.env.length} env var${server.env.length !== 1 ? 's' : ''}`
        : 'No env vars';
    div.appendChild(envVars);

    // Details button
    const button = document.createElement('button');
    button.textContent = 'Details';
    button.onclick = () => showMCPDetails(server.name, server.pack);
    div.appendChild(button);

    return div;
}

/**
 * Handle search input
 */
function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();

    if (!query) {
        // Reset to show all
        renderPacks(allPacks);
        renderMCPServers(allMCPServers);
        return;
    }

    // Filter packs
    const filteredPacks = allPacks.filter(pack => {
        // Search in pack name, description, skills, agents
        const searchText = [
            pack.name,
            pack.plugin.name,
            pack.plugin.description,
            ...pack.skills.map(s => s.name + ' ' + s.description),
            ...pack.agents.map(a => a.name + ' ' + a.description)
        ].join(' ').toLowerCase();

        return searchText.includes(query);
    });

    // Filter MCP servers
    const filteredServers = allMCPServers.filter(server => {
        // Search in server name, pack, command
        const searchText = [
            server.name,
            server.pack,
            server.command,
            ...server.env
        ].join(' ').toLowerCase();

        return searchText.includes(query);
    });

    renderPacks(filteredPacks);
    renderMCPServers(filteredServers);
}

/**
 * Toggle section visibility
 */
function toggleSection(sectionId) {
    const section = document.getElementById(`${sectionId}-section`);
    section.classList.toggle('collapsed');
}

/**
 * Show pack details modal (XSS-safe)
 */
function showPackDetails(packName) {
    const pack = data.packs.find(p => p.name === packName);
    if (!pack) return;

    const modal = document.getElementById('pack-modal');
    const details = document.getElementById('pack-details');

    // Clear previous content
    details.textContent = '';

    // Pack name
    const h2 = document.createElement('h2');
    h2.textContent = pack.plugin.name || pack.name;
    details.appendChild(h2);

    // Description
    const p = document.createElement('p');
    p.textContent = pack.plugin.description || 'No description available';
    details.appendChild(p);

    // Skills section
    if (pack.skills.length > 0) {
        const skillsH3 = document.createElement('h3');
        skillsH3.textContent = `Skills (${pack.skills.length})`;
        details.appendChild(skillsH3);

        const skillsUl = document.createElement('ul');
        pack.skills.forEach(s => {
            const li = document.createElement('li');
            const strong = document.createElement('strong');
            strong.textContent = s.name;
            li.appendChild(strong);
            li.appendChild(document.createTextNode(': ' + (s.description.substring(0, 150) + (s.description.length > 150 ? '...' : ''))));
            skillsUl.appendChild(li);
        });
        details.appendChild(skillsUl);
    }

    // Agents section
    if (pack.agents.length > 0) {
        const agentsH3 = document.createElement('h3');
        agentsH3.textContent = `Agents (${pack.agents.length})`;
        details.appendChild(agentsH3);

        const agentsUl = document.createElement('ul');
        pack.agents.forEach(a => {
            const li = document.createElement('li');
            const strong = document.createElement('strong');
            strong.textContent = a.name;
            li.appendChild(strong);
            li.appendChild(document.createTextNode(': ' + (a.description.substring(0, 150) + (a.description.length > 150 ? '...' : ''))));
            agentsUl.appendChild(li);
        });
        details.appendChild(agentsUl);
    }

    // Installation section
    const installH3 = document.createElement('h3');
    installH3.textContent = 'Installation';
    details.appendChild(installH3);

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = `git clone https://github.com/dmartinol/ai5-marketplaces\ncd ai5-marketplaces/${pack.name}`;
    pre.appendChild(code);
    details.appendChild(pre);

    modal.style.display = 'block';
}

/**
 * Show MCP server details modal (XSS-safe)
 */
function showMCPDetails(serverName, packName) {
    const server = data.mcp_servers.find(s => s.name === serverName && s.pack === packName);
    if (!server) return;

    const modal = document.getElementById('mcp-modal');
    const details = document.getElementById('mcp-details');

    // Clear previous content
    details.textContent = '';

    // Server name
    const h2 = document.createElement('h2');
    h2.textContent = server.name;
    details.appendChild(h2);

    // Pack
    const packP = document.createElement('p');
    packP.textContent = 'From pack: ';
    const strong = document.createElement('strong');
    strong.textContent = server.pack;
    packP.appendChild(strong);
    details.appendChild(packP);

    // Command section
    const cmdH3 = document.createElement('h3');
    cmdH3.textContent = 'Command';
    details.appendChild(cmdH3);

    const cmdPre = document.createElement('pre');
    const cmdCode = document.createElement('code');
    cmdCode.textContent = `${server.command} ${server.args.join(' ')}`;
    cmdPre.appendChild(cmdCode);
    details.appendChild(cmdPre);

    // Environment variables section
    const envH3 = document.createElement('h3');
    envH3.textContent = 'Environment Variables';
    details.appendChild(envH3);

    if (server.env.length > 0) {
        const envUl = document.createElement('ul');
        server.env.forEach(v => {
            const li = document.createElement('li');
            li.textContent = v;
            envUl.appendChild(li);
        });
        details.appendChild(envUl);
    } else {
        const noneP = document.createElement('p');
        noneP.textContent = 'None';
        details.appendChild(noneP);
    }

    // Security section
    const secH3 = document.createElement('h3');
    secH3.textContent = 'Security';
    details.appendChild(secH3);

    const secUl = document.createElement('ul');
    ['isolation', 'network', 'credentials'].forEach(key => {
        const li = document.createElement('li');
        const keyLabel = key.charAt(0).toUpperCase() + key.slice(1);
        li.textContent = `${keyLabel}: ${server.security[key] || 'N/A'}`;
        secUl.appendChild(li);
    });
    details.appendChild(secUl);

    modal.style.display = 'block';
}

/**
 * Setup modal close handlers
 */
function setupModals() {
    // Close buttons
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Click outside modal to close
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // ESC key to close
    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

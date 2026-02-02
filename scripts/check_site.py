#!/usr/bin/env python3
"""
Interactive site checker - verifies the documentation site works correctly.
Run this AFTER starting the local server with 'make serve'.
"""

import json
import sys
from pathlib import Path

def load_data():
    """Load the generated data.json"""
    data_file = Path('docs/data.json')
    if not data_file.exists():
        print("❌ Error: docs/data.json not found")
        print("Run 'make generate' first")
        sys.exit(1)

    with open(data_file) as f:
        return json.load(f)

def print_summary(data):
    """Print a summary of what should appear on the site"""
    print("\n" + "="*60)
    print("📊 Documentation Site Summary")
    print("="*60)

    # Repository info
    repo = data['repository']
    print(f"\n🏛️  Repository: {repo['name']}")
    print(f"   Owner: {repo['owner']}")
    print(f"   Generated: {data['generated_at']}")

    # Packs section
    print(f"\n📦 Agentic Packs ({len(data['packs'])} total)")
    print("   " + "-"*56)
    for pack in data['packs']:
        plugin = pack['plugin']
        print(f"   • {plugin.get('name', pack['name'])} v{plugin.get('version', 'N/A')}")
        print(f"     Skills: {len(pack['skills'])}, Agents: {len(pack['agents'])}")
        if pack['skills']:
            skill_names = ', '.join(s['name'] for s in pack['skills'][:3])
            print(f"     Skills: {skill_names}")
            if len(pack['skills']) > 3:
                print(f"             ... and {len(pack['skills']) - 3} more")

    # MCP Servers section
    print(f"\n🔌 MCP Servers ({len(data['mcp_servers'])} total)")
    print("   " + "-"*56)
    for server in data['mcp_servers']:
        print(f"   • {server['name']} (from {server['pack']})")
        print(f"     Command: {server['command']}")
        if server['env']:
            print(f"     Env vars: {', '.join(server['env'])}")
        print(f"     Security: {server['security'].get('isolation', 'N/A')}")

    print("\n" + "="*60)

def print_checklist():
    """Print a manual testing checklist"""
    print("\n✅ Manual Testing Checklist")
    print("="*60)
    print("""
1. Open http://localhost:8000 in your browser

2. Verify the header:
   □ Title displays: "ai5-marketplaces"
   □ Subtitle displays
   □ Search bar is visible

3. Test Agentic Packs section:
   □ Section header shows correct count
   □ Pack cards display in a grid
   □ Each card shows: name, version, skill/agent counts
   □ "View Details" button works
   □ Modal shows: skills list, agents list, installation code
   □ Modal closes correctly

4. Test MCP Servers section:
   □ Section header shows correct count
   □ Server cards display in a grid
   □ Each card shows: name, pack, container, env var count
   □ "Details" button works
   □ Modal shows: command, env vars, security settings
   □ Modal closes correctly

5. Test collapsible sections:
   □ Click section headers to collapse/expand
   □ Arrow icon changes (▼ ↔ ▶)
   □ Grid hides/shows smoothly

6. Test search functionality:
   □ Type in search bar
   □ Results filter dynamically
   □ Search works across: pack names, skills, agents, MCP servers

7. Test responsive design:
   □ Resize browser window
   □ Cards reflow in grid
   □ Mobile view works

8. Verify Red Hat branding:
   □ Red Hat red (#ee0000) used for accents
   □ Dark theme applied consistently
   □ Font rendering looks good
""")
    print("="*60)

def main():
    print("\n🧪 Interactive Site Checker")

    try:
        data = load_data()
        print_summary(data)
        print_checklist()

        print("\n💡 Tips:")
        print("   - If the server isn't running, open a new terminal and run: make serve")
        print("   - Press Ctrl+C in the server terminal to stop it")
        print("   - Make changes to scripts and run 'make generate' to update data.json")
        print("   - The browser will need a refresh to see changes")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

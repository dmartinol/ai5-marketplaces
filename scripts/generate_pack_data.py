#!/usr/bin/env python3
"""
Parse agentic packs and extract plugin metadata, skills, and agents.
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Any
import yaml

# List of agentic packs to parse
PACK_DIRS = ['rh-sre', 'rh-developer', 'ocp-admin', 'rh-support-engineer', 'rh-virt']


def parse_yaml_frontmatter(file_path: Path) -> Dict[str, Any]:
    """
    Extract YAML frontmatter from a markdown file.

    Args:
        file_path: Path to the markdown file

    Returns:
        Dictionary containing the frontmatter data
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Match YAML frontmatter (---\n...\n---)
        match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
        if not match:
            return {}

        frontmatter_text = match.group(1)
        return yaml.safe_load(frontmatter_text) or {}

    except Exception as e:
        print(f"Warning: Failed to parse frontmatter from {file_path}: {e}")
        return {}


def parse_plugin_json(pack_dir: str) -> Dict[str, Any]:
    """
    Parse plugin.json from a pack directory.

    Args:
        pack_dir: Name of the pack directory

    Returns:
        Dictionary with plugin metadata, or defaults if file doesn't exist
    """
    plugin_path = Path(pack_dir) / '.claude-plugin' / 'plugin.json'

    # Default values if plugin.json doesn't exist
    defaults = {
        'name': pack_dir,
        'version': '0.0.0',
        'description': f'{pack_dir} agentic pack',
        'author': {'name': 'Red Hat'},
        'license': 'Apache-2.0',
        'keywords': []
    }

    if not plugin_path.exists():
        return defaults

    try:
        with open(plugin_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Merge with defaults (in case some fields are missing)
        return {**defaults, **data}

    except Exception as e:
        print(f"Warning: Failed to parse {plugin_path}: {e}")
        return defaults


def parse_skills(pack_dir: str) -> List[Dict[str, Any]]:
    """
    Parse skills from skills/*/SKILL.md files.

    Args:
        pack_dir: Name of the pack directory

    Returns:
        List of skill dictionaries with name, description, file_path
    """
    skills = []
    skills_dir = Path(pack_dir) / 'skills'

    if not skills_dir.exists():
        return skills

    # Find all SKILL.md files
    for skill_file in skills_dir.glob('*/SKILL.md'):
        frontmatter = parse_yaml_frontmatter(skill_file)

        # Extract name and description
        name = frontmatter.get('name', skill_file.parent.name)
        description = frontmatter.get('description', '')

        # Clean up description (remove leading/trailing whitespace, collapse newlines)
        if isinstance(description, str):
            description = ' '.join(description.split())

        skills.append({
            'name': name,
            'description': description,
            'file_path': str(skill_file.relative_to(pack_dir))
        })

    return sorted(skills, key=lambda s: s['name'])


def parse_agents(pack_dir: str) -> List[Dict[str, Any]]:
    """
    Parse agents from agents/*.md files.

    Args:
        pack_dir: Name of the pack directory

    Returns:
        List of agent dictionaries with name, description, model, tools, file_path
    """
    agents = []
    agents_dir = Path(pack_dir) / 'agents'

    if not agents_dir.exists():
        return agents

    # Find all .md files in agents directory
    for agent_file in agents_dir.glob('*.md'):
        frontmatter = parse_yaml_frontmatter(agent_file)

        # Extract metadata
        name = frontmatter.get('name', agent_file.stem)
        description = frontmatter.get('description', '')
        model = frontmatter.get('model', 'inherit')
        tools = frontmatter.get('tools', [])

        # Clean up description
        if isinstance(description, str):
            description = ' '.join(description.split())

        agents.append({
            'name': name,
            'description': description,
            'model': model,
            'tools': tools,
            'file_path': str(agent_file.relative_to(pack_dir))
        })

    return sorted(agents, key=lambda a: a['name'])


def generate_pack_data() -> List[Dict[str, Any]]:
    """
    Generate pack data for all agentic packs.

    Returns:
        List of pack dictionaries
    """
    packs = []

    for pack_dir in PACK_DIRS:
        pack_path = Path(pack_dir)

        if not pack_path.exists():
            print(f"Warning: Pack directory {pack_dir} does not exist, skipping")
            continue

        pack = {
            'name': pack_dir,
            'path': f'./{pack_dir}',
            'plugin': parse_plugin_json(pack_dir),
            'skills': parse_skills(pack_dir),
            'agents': parse_agents(pack_dir),
            'has_readme': (pack_path / 'README.md').exists()
        }

        packs.append(pack)

        print(f"✓ Parsed {pack_dir}: {len(pack['skills'])} skills, {len(pack['agents'])} agents")

    return packs


if __name__ == '__main__':
    # Test the script
    print("Parsing agentic packs...")
    print()

    packs = generate_pack_data()

    print()
    print(f"Found {len(packs)} packs total")
    print()
    print("Summary:")
    for pack in packs:
        plugin = pack['plugin']
        print(f"  • {plugin['name']} v{plugin['version']}")
        print(f"    Skills: {len(pack['skills'])}, Agents: {len(pack['agents'])}")

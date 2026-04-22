const fs = require("fs");
const path = require("path");

const GROUPS_FILE = path.join(__dirname, "groups.json");

function loadGroups() {
  try {
    const raw = fs.readFileSync(GROUPS_FILE, "utf8");
    if (!raw.trim()) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    console.error("Failed to load groups.json:", error);
    return {};
  }
}

const groups = loadGroups();

function saveState() {
  fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
}

function getGroup(id) {
  return groups[id] || null;
}

function getGroups() {
  return groups;
}

function createGroup(data) {
  groups[data.id] = data;
  saveState();
  return groups[data.id];
}

function updateGroup(id, data) {
  const existing = getGroup(id);
  if (!existing) {
    return null;
  }

  const nextGroup =
    typeof data === "function"
      ? data(existing)
      : {
          ...existing,
          ...data,
        };

  groups[id] = nextGroup;
  saveState();
  return groups[id];
}

function deleteGroup(id) {
  const existing = getGroup(id);
  if (!existing) {
    return false;
  }

  delete groups[id];
  saveState();
  return true;
}

module.exports = {
  GROUPS_FILE,
  createGroup,
  deleteGroup,
  getGroup,
  getGroups,
  saveState,
  updateGroup,
};

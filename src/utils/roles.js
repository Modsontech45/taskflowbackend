const RoleOrder = { VIEWER: 1, EDITOR: 2, OWNER: 3 };

function hasRoleOrAbove(actual, required) {
  return RoleOrder[actual] >= RoleOrder[required];
}

module.exports = { hasRoleOrAbove, RoleOrder };

export const VIEWER_QUERY = `query Viewer { viewer { id } }`;

export const TEAMS_QUERY = `query Teams {
  teams { nodes { id name } }
}`;

export const PROJECTS_QUERY = `query Projects($teamId: String!) {
  team(id: $teamId) {
    projects { nodes { id name } }
  }
}`;

export const WORKFLOW_STATES_QUERY = `query WorkflowStates($teamId: String!) {
  team(id: $teamId) {
    states { nodes { id name type } }
  }
}`;

const ISSUE_NODE_FIELDS = `
  id
  identifier
  title
  description
  priority
  updatedAt
  dueDate
  state { id name }
  assignee { id email name }
  labels { nodes { id name } }
`;

export const ISSUES_PAGE_QUERY = `query IssuesPage($projectId: ID!, $first: Int!, $after: String) {
  issues(
    filter: { project: { id: { eq: $projectId } } }
    first: $first
    after: $after
  ) {
    pageInfo { hasNextPage endCursor }
    nodes { ${ISSUE_NODE_FIELDS} }
  }
}`;

export const ISSUES_INCREMENTAL_QUERY = `query IssuesIncremental(
  $projectId: ID!
  $first: Int!
  $after: String
  $updatedAtFilter: DateTimeOrDuration!
) {
  issues(
    filter: {
      project: { id: { eq: $projectId } }
      updatedAt: { gt: $updatedAtFilter }
    }
    first: $first
    after: $after
  ) {
    pageInfo { hasNextPage endCursor }
    nodes { ${ISSUE_NODE_FIELDS} }
  }
}`;

export const TEAM_LABELS_QUERY = `query TeamLabels($teamId: String!) {
  team(id: $teamId) {
    labels { nodes { id name } }
  }
}`;

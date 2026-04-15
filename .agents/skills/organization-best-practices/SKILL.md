---
name: organization-best-practices
description: Configure multi-tenant organizations, manage members and invitations, define custom roles and permissions, set up teams, and implement RBAC using Better Auth's organization plugin. Use when users need org setup, team management, member roles, access control, or the Better Auth organization plugin.
---

## Setup

1. Add `organization()` plugin to server config
2. Add `organizationClient()` plugin to client config
3. Run `npx @better-auth/cli migrate`
4. Verify: check that organization, member, invitation tables exist in your database

```ts
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5, // Max orgs per user
      membershipLimit: 100, // Max members per org
    }),
  ],
});
```

### Client-Side Setup

```ts
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [organizationClient()],
});
```

## Creating Organizations

The creator is automatically assigned the `owner` role.

```ts
const createOrg = async () => {
  const { data, error } = await authClient.organization.create({
    name: "My Company",
    slug: "my-company",
    logo: "https://example.com/logo.png",
    metadata: { plan: "pro" },
  });
};
```

### Controlling Organization Creation

Restrict who can create organizations based on user attributes:

```ts
organization({
  allowUserToCreateOrganization: async (user) => {
    return user.emailVerified === true;
  },
  organizationLimit: async (user) => {
    // Premium users get more organizations
    return user.plan === "premium" ? 20 : 3;
  },
});
```

### Creating Organizations on Behalf of Users

Administrators can create organizations for other users (server-side only):

```ts
await auth.api.createOrganization({
  body: {
    name: "Client Organization",
    slug: "client-org",
    userId: "user-id-who-will-be-owner", // `userId` is required
  },
});
```

**Note**: The `userId` parameter cannot be used alongside session headers.


## Active Organizations

Stored in the session and scopes subsequent API calls. Set after user selects one.

```ts
const setActive = async (organizationId: string) => {
  const { data, error } = await authClient.organization.setActive({
    organizationId,
  });
};
```

Many endpoints use the active organization when `organizationId` is not provided (`listMembers`, `listInvitations`, `inviteMember`, etc.).

Use `getFullOrganization()` to retrieve the active org with all members, invitations, and teams.

## Members

### Adding Members (Server-Side)

```ts
await auth.api.addMember({
  body: {
    userId: "user-id",
    role: "member",
    organizationId: "org-id",
  },
});
```

For client-side member additions, use the invitation system instead.

### Assigning Multiple Roles

```ts
await auth.api.addMember({
  body: {
    userId: "user-id",
    role: ["admin", "moderator"],
    organizationId: "org-id",
  },
});
```

### Removing Members

Use `removeMember({ memberIdOrEmail })`. The last owner cannot be removed — assign ownership to another member first.

### Updating Member Roles

Use `updateMemberRole({ memberId, role })`.

### Membership Limits

```ts
organization({
  membershipLimit: async (user, organization) => {
    if (organization.metadata?.plan === "enterprise") {
      return 1000;
    }
    return 50;
  },
});
```

## Invitations

### Setting Up Invitation Emails

```ts
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { sendEmail } from "./email";

export const auth = betterAuth({
  plugins: [
    organization({
      sendInvitationEmail: async (data) => {
        const { email, organization, inviter, invitation } = data;

        await sendEmail({
          to: email,
          subject: `Join ${organization.name}`,
          html: `
            <p>${inviter.user.name} invited you to join ${organization.name}</p>
            <a href="https://yourapp.com/accept-invite?id=${invitation.id}">
              Accept Invitation
            </a>
          `,
        });
      },
    }),
  ],
});
```

### Sending Invitations

```ts
await authClient.organization.inviteMember({
  email: "newuser@example.com",
  role: "member",
});
```

### Shareable Invitation URLs

```ts
const { data } = await authClient.organization.getInvitationURL({
  email: "newuser@example.com",
  role: "member",
  callbackURL: "https://yourapp.com/dashboard",
});

// Share data.url via any channel
```

This endpoint does not call `sendInvitationEmail` — handle delivery yourself.

### Invitation Configuration

```ts
organization({
  invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days (default: 48 hours)
  invitationLimit: 100, // Max pending invitations per org
  cancelPendingInvitationsOnReInvite: true, // Cancel old invites when re-inviting
});
```

## Roles & Permissions

Default roles: `owner` (full access), `admin` (manage members/invitations/settings), `member` (basic access).

### Checking Permissions

```ts
const { data } = await authClient.organization.hasPermission({
  permission: "member:write",
});

if (data?.hasPermission) {
  // User can manage members
}
```

Use `checkRolePermission({ role, permissions })` for client-side UI rendering (static only). For dynamic access control, use the `hasPermission` endpoint.

## Teams

### Enabling Teams

```ts
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    organization({
        teams: {
            enabled: true
        }
    }),
  ],
});
```

### Creating Teams

```ts
const { data } = await authClient.organization.createTeam({
  name: "Engineering",
});
```

### Managing Team Members

Use `addTeamMember({ teamId, userId })` (member must be in org first) and `removeTeamMember({ teamId, userId })` (stays in org).

Set active team with `setActiveTeam({ teamId })`.

### Team Limits

```ts
organization({
  teams: {
      maximumTeams: 20, // Max teams per org
      maximumMembersPerTeam: 50, // Max members per team
      allowRemovingAllTeams: false, // Prevent removing last team
  }
});
```

## Dynamic Access Control

### Enabling Dynamic Access Control

```ts
import { organization } from "better-auth/plugins";
import { dynamicAccessControl } from "@better-auth/organization/addons";

export const auth = betterAuth({
  plugins: [
    organization({
        dynamicAccessControl: {
            enabled: true
        }
    }),
  ],
});
```

### Creating Custom Roles

```ts
await authClient.organization.createRole({
  role: "moderator",
  permission: {
    member: ["read"],
    invitation: ["read"],
  },
});
```

Use `updateRole({ roleId, permission })` and `deleteRole({ roleId })`. Pre-defined roles (owner, admin, member) cannot be deleted. Roles assigned to members cannot be deleted until reassigned.

## Lifecycle Hooks

Execute custom logic at various points in the organization lifecycle:

```ts
organization({
  hooks: {
    organization: {
      beforeCreate: async ({ data, user }) => {
        // Validate or modify data before creation
        return {
          data: {
            ...data,
            metadata: { ...data.metadata, createdBy: user.id },
          },
        };
      },
      afterCreate: async ({ organization, member }) => {
        // Post-creation logic (e.g., send welcome email, create default resources)
        await createDefaultResources(organization.id);
      },
      beforeDelete: async ({ organization }) => {
        // Cleanup before deletion
        await archiveOrganizationData(organization.id);
      },
    },
    member: {
      afterCreate: async ({ member, organization }) => {
        await notifyAdmins(organization.id, `New member joined`);
      },
    },
    invitation: {
      afterCreate: async ({ invitation, organization, inviter }) => {
        await logInvitation(invitation);
      },
    },
  },
});
```

## Schema Customization

Customize table names, field names, and add additional fields:

```ts
organization({
  schema: {
    organization: {
      modelName: "workspace", // Rename table
      fields: {
        name: "workspaceName", // Rename fields
      },
      additionalFields: {
        billingId: {
          type: "string",
          required: false,
        },
      },
    },
    member: {
      additionalFields: {
        department: {
          type: "string",
          required: false,
        },
        title: {
          type: "string",
          required: false,
        },
      },
    },
  },
});
```

## Security Considerations

### Owner Protection

- The last owner cannot be removed from an organization
- The last owner cannot leave the organization
- The owner role cannot be removed from the last owner

Always ensure ownership transfer before removing the current owner:

```ts
// Transfer ownership first
await authClient.organization.updateMemberRole({
  memberId: "new-owner-member-id",
  role: "owner",
});

// Then the previous owner can be demoted or removed
```

### Organization Deletion

Deleting an organization removes all associated data (members, invitations, teams). Prevent accidental deletion:

```ts
organization({
  disableOrganizationDeletion: true, // Disable via config
});
```

Or implement soft delete via hooks:

```ts
organization({
  hooks: {
    organization: {
      beforeDelete: async ({ organization }) => {
        // Archive instead of delete
        await archiveOrganization(organization.id);
        throw new Error("Organization archived, not deleted");
      },
    },
  },
});
```

### Invitation Security

- Invitations expire after 48 hours by default
- Only the invited email address can accept an invitation
- Pending invitations can be cancelled by organization admins

## Complete Configuration Example

```ts
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { sendEmail } from "./email";

export const auth = betterAuth({
  plugins: [
    organization({
      // Organization limits
      allowUserToCreateOrganization: true,
      organizationLimit: 10,
      membershipLimit: 100,
      creatorRole: "owner",

      // Slugs
      defaultOrganizationIdField: "slug",

      // Invitations
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
      invitationLimit: 50,
      sendInvitationEmail: async (data) => {
        await sendEmail({
          to: data.email,
          subject: `Join ${data.organization.name}`,
          html: `<a href="https://app.com/invite/${data.invitation.id}">Accept</a>`,
        });
      },

      // Hooks
      hooks: {
        organization: {
          afterCreate: async ({ organization }) => {
            console.log(`Organization ${organization.name} created`);
          },
        },
      },
    }),
  ],
});
```

# Project Specifig Features

You are building a multi-tenant SaaS system with a clear separation between Organizations, Projects, and Teams.

## Core Architecture

The system must follow this hierarchy:

Organization
│
├── Projects
│     ├── Project A
│     ├── Project B
│
├── Teams
│     ├── Frontend Team
│     ├── Backend Team
│     ├── Team A
│
└── Team ↔️ Project Assignments
├── Frontend → Project A
├── Backend → Project B

## Requirements

1. Organizations

* Each organization represents a company/workspace
* Organizations own all projects and teams
* Users belong to an organization

2. Projects

* Projects are business-level entities (NOT infrastructure projects)
* Projects belong to an organization
* Projects do NOT directly store user permissions

3. Teams

* Teams are independent groups within an organization
* Teams can represent roles like frontend, backend, or custom groups
* Users are assigned to teams

4. Team Membership

* A user can belong to multiple teams
* A team can have multiple users

5. Team ↔️ Project Assignment

* Teams are assigned to projects
* Access to a project is granted ONLY through team membership
* Users do NOT get direct access to projects

6. Authorization Rules

* A user can access a project IF:

  * The user belongs to a team
  * That team is assigned to the project
* Optional: support roles at the team-project level (viewer, editor, admin)

7. Authentication

* Use Better Auth for authentication
* Use session.user.id as the identity reference
* Do NOT rely on the auth provider for authorization logic

8. Database Design

Required tables:

* organizations

  * id
  * name

* users (from auth)

* projects

  * id
  * name
  * organization_id

* teams

  * id
  * name
  * organization_id

* team_members

  * id
  * user_id
  * team_id

* team_projects

  * id
  * team_id
  * project_id

Optional:

* team_project_roles (team_id, project_id, role)

9. Access Flow

All authorization checks must follow this flow:

User → Team Membership → Team → Project Assignment → Project Access

10. Constraints

* No direct user-to-project relationship
* No project access without team assignment
* All entities must belong to an organization
* System must support scalability for multiple organizations (multi-tenancy)

11. Implementation Notes

* Use a single backend (e.g. Supabase) as infrastructure
* Treat "projects" as application-level entities, not backend instances
* Implement authorization logic in the application layer or via database policies
* Prefer reusable permission-checking utilities (e.g. canAccessProject(userId, projectId))

## Goal

Create a flexible, scalable authorization system where:

* Teams are reusable across projects
* Permissions are centrally managed via teams
* Projects remain clean and do not manage users directly
* The system is extensible for roles and future access control needs

Ensure the implementation strictly follows this architecture and does not fall back to user-based direct permissions.

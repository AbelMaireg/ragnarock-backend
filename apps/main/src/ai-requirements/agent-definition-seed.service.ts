import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { PrismaService } from "@app/prisma";

const AGENT_DEFINITIONS = [
  {
    key: "requirements",
    name: "Requirements Agent",
    description:
      "Conversational agent that elicits and refines project requirements into a structured SRS.",
    persona: "business_owner",
    sdlcPhase: "requirements",
    mode: "conversational" as const,
  },
  {
    key: "developer_intelligence",
    name: "Developer Intelligence Agent",
    description:
      "Answers developer architecture, stack, and implementation questions grounded in project SRS. Also generates architecture documents on demand.",
    persona: "developer",
    sdlcPhase: "implementation",
    mode: "conversational" as const,
  },
  {
    key: "project_planner",
    name: "Project Planner Agent",
    description:
      "Generates a structured project plan and task backlog from an approved SRS.",
    persona: "project_manager",
    sdlcPhase: "planning",
    mode: "one_shot" as const,
  },
  {
    key: "qa_intelligence",
    name: "QA Intelligence Agent",
    description:
      "Generates test plans, test cases, and quality criteria from requirements.",
    persona: "qa_engineer",
    sdlcPhase: "test",
    mode: "conversational" as const,
  },
  {
    key: "change_impact",
    name: "Change Impact Agent",
    description:
      "Analyses proposed changes and surfaces impact on existing requirements, tasks, and docs.",
    persona: "business_owner",
    sdlcPhase: "requirements",
    mode: "conversational" as const,
  },
] satisfies Array<{
  key: string;
  name: string;
  description: string;
  persona: string;
  sdlcPhase: string;
  mode: "conversational" | "one_shot";
}>;

@Injectable()
export class AgentDefinitionSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AgentDefinitionSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    for (const agent of AGENT_DEFINITIONS) {
      await this.prisma.agentDefinition.upsert({
        where: { key: agent.key },
        update: { name: agent.name, description: agent.description },
        create: agent,
      });
    }
    this.logger.log(`Seeded ${AGENT_DEFINITIONS.length} agent definitions`);
  }
}

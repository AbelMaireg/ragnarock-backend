from app.agents.developer_intelligence_agent import build_system_prompt, build_user_prompt
from app.schemas.requirement import AgentInput, ProjectContext, PartialSrs, Feature, ConversationTurn, RetrievedChunk


def make_agent_input():
    partial = PartialSrs(
        project_name="Demo Project",
        summary="A demo",
        features=[Feature(feature_id="feat_001", name="Login", description="Allow sign-in")],
    )

    ctx = ProjectContext(name="Demo Project", description="Demo desc")

    inp = AgentInput(
        content="How should I implement authentication?",
        project_id="proj-1",
        project_context=ctx,
        conversation_history=[ConversationTurn(role="user", content="I need auth")],
        retrieved_memory=[RetrievedChunk(chunk_type="note", content="previous note", similarity=0.9)],
        partial_srs=partial,
    )
    return inp


def test_build_system_prompt_contains_json_contract():
    s = build_system_prompt()
    assert "Return valid JSON only" in s
    assert "status" in s


def test_build_user_prompt_includes_srs_and_question():
    inp = make_agent_input()
    prompt = build_user_prompt(inp)
    assert "Demo Project" in prompt
    assert "SOFTWARE REQUIREMENTS SPECIFICATION" in prompt
    assert "How should I implement authentication?" in prompt
    assert "Login" in prompt

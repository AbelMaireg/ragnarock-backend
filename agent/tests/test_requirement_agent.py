from app.agents import requirement_agent as ra
from app.schemas.requirement import PartialSrs, Feature, ProjectContext, RetrievedChunk, ConversationTurn


def test_format_project_context_and_partial_srs_empty():
    partial = PartialSrs()
    out = ra._format_partial_srs(partial)
    assert "PARTIAL SRS SO FAR" in out
    assert "(empty" in out


def test_format_partial_srs_with_features_and_progress():
    partial = PartialSrs(
        project_name="P",
        summary="S",
        features=[Feature(feature_id="feat_001", name="Login", description="desc")],
    )
    out = ra._format_partial_srs(partial)
    assert "feat_001" in out
    assert "% complete" in out


def test_format_memory_and_history():
    mem = [RetrievedChunk(chunk_type="note", content="some note", similarity=0.5)]
    m = ra._format_memory(mem)
    assert "PROJECT MEMORY" in m
    assert "some note" in m

    hist = [ConversationTurn(role="user", content="hello"), ConversationTurn(role="assistant", content="hi")]
    h = ra._format_history(hist)
    assert "CONVERSATION HISTORY" in h
    assert "BUSINESS OWNER" in h

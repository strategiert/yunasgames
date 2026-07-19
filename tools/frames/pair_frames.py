from pathlib import Path

from PIL import Image


def build_sequence_prompts(
    species: str,
    posture: str,
    activity: str,
    extra_constraint: str = "",
) -> tuple[str, str]:
    constraint = f" {extra_constraint}." if extra_constraint else ""
    prompt_a = (
        f"Show this same exact {species} {posture}, {activity}. The animal has eyes open and "
        "a calm focused expression. FULL BODY visible, wide shot, the whole animal and cup fit "
        "in frame with generous padding. Preserve the reference animal's species, face, fur "
        f"pattern, proportions and high-quality 3D animated-film style.{constraint} Plain pure "
        "white background, no text, no watermark, no extra animal."
    )
    prompt_b = (
        "Change only the eyelids so both eyes are gently closed in a natural blink. Do not change "
        "the animal identity, species, fur pattern, head position, body pose, paws, tail, cup, "
        "camera, framing, scale, lighting, ground line or background. Keep the full body visible. "
        "No text, no watermark, no extra animal."
    )
    return prompt_a, prompt_b


def build_pair_prompt(
    species: str,
    identity: str,
    activity: str,
    motion: str,
    extra_constraint: str = "",
) -> str:
    constraint = f" {extra_constraint}." if extra_constraint else ""
    return (
        "Create one clean two-panel animation storyboard with two equal panels side by side. "
        f"Both panels show the same exact {species} from the reference image, with {identity}, "
        f"{activity}. Keep the character identity, fur pattern, proportions, camera, lighting, "
        "body orientation, scale, ground line and prop placement identical in both panels. "
        "FULL BODY visible in each panel, wide shot, generous padding, no crop. "
        f"Panel A is the starting pose. In panel B the only movement is: {motion}. "
        "The motion must be subtle enough for a calm two-frame animation flip."
        f"{constraint} Plain pure white background in both panels, no divider, no labels, no "
        "text, no watermark, no extra animal."
    )


def split_storyboard(
    source: Image.Image,
    left_path: Path,
    right_path: Path,
    gutter: int = 0,
) -> None:
    """Split an equally sized two-panel storyboard and omit its center gutter."""
    panel_width = (source.width - gutter) // 2
    right_x = panel_width + gutter
    source.crop((0, 0, panel_width, source.height)).save(left_path)
    source.crop((right_x, 0, right_x + panel_width, source.height)).save(right_path)

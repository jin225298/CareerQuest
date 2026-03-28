"""
NPC像素化脚本
将老师.png和面试官.png转换为像素风格
"""

import os
import sys
from pathlib import Path
from PIL import Image

pixel_animator_path = Path(__file__).parent.parent / "pixel_animator"
sys.path.insert(0, str(pixel_animator_path))

from emotion_animator import (
    get_image_url,
    generate_emotion_frames,
    remove_green_background,
)

NPC_SOURCES = {
    "teacher": {
        "source": Path(__file__).parent.parent / "老师.png",
        "output_name": "teacher",
    },
    "interviewer": {
        "source": Path(__file__).parent.parent / "面试官.png",
        "output_name": "interviewer",
    },
}

OUTPUT_DIR = Path(__file__).parent / "static" / "npcs"
REFERENCE_PATH = pixel_animator_path / "reference.png"


def pixelate_npc(source_path: Path, output_path: Path, npc_name: str):
    print(f"\n{'=' * 50}")
    print(f"🎭 处理NPC: {npc_name}")
    print(f"{'=' * 50}")

    if not source_path.exists():
        print(f"❌ 找不到源文件: {source_path}")
        return False

    if not REFERENCE_PATH.exists():
        print(f"❌ 找不到参考图: {REFERENCE_PATH}")
        return False

    if not os.environ.get("ARK_API_KEY"):
        print("❌ 请设置 ARK_API_KEY")
        return False

    print(f"📤 上传参考图...")
    reference_url = get_image_url(str(REFERENCE_PATH))

    print(f"📤 上传NPC图片...")
    character_url = get_image_url(str(source_path))

    print(f"🎨 生成像素风格...")
    frames = generate_emotion_frames(
        reference_url=reference_url,
        character_url=character_url,
        emotion="happy",
        num_frames=1,
    )

    if not frames:
        print(f"❌ 生成失败")
        return False

    frame = frames[0]
    frame = remove_green_background(frame)
    frame.save(str(output_path))

    print(f"✅ 保存到: {output_path}")
    return True


def main():
    print("=" * 50)
    print("🎭 NPC像素化转换器")
    print("=" * 50)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    success_count = 0
    for npc_key, npc_info in NPC_SOURCES.items():
        source_path = npc_info["source"]
        output_name = npc_info["output_name"]
        output_path = OUTPUT_DIR / f"{output_name}.png"

        if pixelate_npc(source_path, output_path, npc_key):
            success_count += 1

    print("\n" + "=" * 50)
    print(f"✅ 完成！成功: {success_count}/{len(NPC_SOURCES)}")
    print("=" * 50)


if __name__ == "__main__":
    main()

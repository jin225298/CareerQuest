"""
角色表情动画生成器
流程：参考图 + 人物照片 → API生成 → 动画
"""

from PIL import Image
import numpy as np
import os
import requests
import base64
from io import BytesIO
from openai import OpenAI
from dotenv import load_dotenv

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

client = OpenAI(
    base_url="https://ark.cn-beijing.volces.com/api/v3",
    api_key=os.environ.get("ARK_API_KEY"),
)

EMOTION_PROMPTS = {
    "happy": "像素风格，16bit，角色全身立绘，开心表情，原地小幅跳跃动作，手臂向上挥舞，微笑，充满活力的姿态，纯绿色背景 #00FF00",
    "sad": "像素风格，16bit，角色全身立绘，悲伤表情，蹲着的姿势，双手抱膝，低头，忧郁氛围，纯绿色背景 #00FF00",
    "excited": "像素风格，16bit，角色全身立绘，激动表情，原地小跑踏步动作，双手握拳挥动，兴奋期待的氛围，纯绿色背景 #00FF00",
}


def upload_to_imgbb(image_path):
    """上传图片到 imgbb"""
    api_key = os.environ.get("IMGBB_API_KEY")
    if not api_key:
        return None

    url = "https://api.imgbb.com/1/upload"
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read()).decode()

    payload = {"key": api_key, "image": img_base64}
    response = requests.post(url, data=payload)

    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            return data["data"]["url"]
    return None


def image_to_base64_url(image_path):
    """转换为 base64 data URL"""
    with open(image_path, "rb") as f:
        img_data = f.read()
    b64 = base64.b64encode(img_data).decode()
    return f"data:image/png;base64,{b64}"


def get_image_url(image_path):
    """获取图片URL"""
    url = upload_to_imgbb(image_path)
    if url:
        print(f"  ✅ 上传成功")
        return url
    print("  📦 使用 base64 编码...")
    return image_to_base64_url(image_path)


def generate_emotion_frames(reference_url, character_url, emotion, num_frames=8):
    """根据参考图和人物照片生成特定情绪的动画帧"""
    prompt = EMOTION_PROMPTS.get(emotion, EMOTION_PROMPTS["happy"])

    logger.info(f"生成 {emotion} 情绪动画 ({num_frames} 帧)...")
    print(f"\n🎨 生成 {emotion} 情绪动画 ({num_frames} 帧)...")

    try:
        response = client.images.generate(
            model="doubao-seedream-4-5-251128",
            prompt=f"参考第一张图的像素风格，将第二张图片的人物转换为像素风格角色。{prompt}。保持人物特征，生成连贯动画帧，动作自然流畅",
            size="2K",
            response_format="b64_json",
            stream=True,
            extra_body={
                "image": [reference_url, character_url],
                "watermark": False,
                "sequential_image_generation": "auto",
                "sequential_image_generation_options": {"max_images": num_frames},
            },
        )
    except Exception as e:
        logger.error(f"API调用失败 [{emotion}]: {type(e).__name__}: {e}")
        print(f"  ❌ API调用失败: {e}")
        return []

    frames = []
    error_events = []

    for event in response:
        if event is None:
            continue
        elif event.type == "image_generation.partial_succeeded":
            if event.b64_json is not None:
                try:
                    image_data = base64.b64decode(event.b64_json)
                    img = Image.open(BytesIO(image_data)).convert("RGBA")
                    frames.append(img)
                    print(f"  ✅ 获取第 {len(frames)} 帧")
                except Exception as e:
                    logger.error(f"解码图像失败: {e}")
                    print(f"  ⚠️ 解码图像失败: {e}")
        elif event.type == "error" or "error" in str(event.type).lower():
            error_info = getattr(event, "message", str(event))
            error_events.append(error_info)
            logger.error(f"API错误事件 [{emotion}]: {error_info}")
            print(f"  ❌ API错误: {error_info}")

    if not frames:
        logger.warning(f"未获取到任何帧 [{emotion}], 错误: {error_events}")
        print(f"  ⚠️ 未获取到帧，可能原因: {error_events if error_events else '未知'}")

    return frames


def remove_green_background(img, tolerance=35):
    """移除绿色背景"""
    arr = np.array(img)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

    green_mask = (g > 140) & (g > r * 1.3) & (g > b * 1.3)

    arr[:, :, 3] = np.where(green_mask, 0, a)
    return Image.fromarray(arr)


def create_animation_from_frames(frames, output_path, duration=100):
    """从帧序列创建动画GIF"""
    if not frames:
        return None

    processed_frames = []
    for frame in frames:
        frame = remove_green_background(frame)
        processed_frames.append(frame)

    processed_frames[0].save(
        output_path,
        save_all=True,
        append_images=processed_frames[1:],
        duration=duration,
        loop=0,
        disposal=2,
    )

    return output_path


def generate_all_emotions(
    reference_path,
    character_path,
    output_dir="emotions",
    emotions=["happy", "sad", "excited"],
    frames_per_emotion=8,
):
    """生成所有情绪的动画"""
    print("=" * 50)
    print("🎭 角色表情动画生成器")
    print("=" * 50)
    logger.info(
        f"开始生成动画: reference={reference_path}, character={character_path}, output={output_dir}"
    )

    if not os.path.exists(reference_path):
        error_msg = f"找不到参考图: {reference_path}"
        logger.error(error_msg)
        print(f"❌ {error_msg}")
        return None

    if not os.path.exists(character_path):
        error_msg = f"找不到人物照片: {character_path}"
        logger.error(error_msg)
        print(f"❌ {error_msg}")
        return None

    if not os.environ.get("ARK_API_KEY"):
        error_msg = "ARK_API_KEY 未设置"
        logger.error(error_msg)
        print(f"❌ 请设置 ARK_API_KEY")
        return None

    imgbb_key = os.environ.get("IMGBB_API_KEY")
    if not imgbb_key:
        logger.warning("IMGBB_API_KEY 未设置，将使用 base64 编码（可能影响性能）")
        print("  ⚠️ IMGBB_API_KEY 未设置，使用 base64 编码")

    os.makedirs(output_dir, exist_ok=True)

    print(f"\n📤 上传风格参考图...")
    logger.info("上传参考图...")
    reference_url = get_image_url(reference_path)
    if not reference_url:
        error_msg = "上传参考图失败"
        logger.error(error_msg)
        print(f"❌ {error_msg}")
        return None

    print(f"\n📤 上传人物照片...")
    logger.info("上传人物照片...")
    character_url = get_image_url(character_path)
    if not character_url:
        error_msg = "上传人物照片失败"
        logger.error(error_msg)
        print(f"❌ {error_msg}")
        return None

    print(f"\n✅ 图片准备完成")
    logger.info(
        f"图片URL准备完成: ref={reference_url[:50]}..., char={character_url[:50]}..."
    )

    results = {}
    failed_emotions = []

    for emotion in emotions:
        print(f"\n{'=' * 40}")

        frames = generate_emotion_frames(
            reference_url, character_url, emotion, frames_per_emotion
        )

        if not frames:
            error_msg = f"生成 {emotion} 动画失败：未获取到帧"
            logger.error(error_msg)
            print(f"  ❌ {error_msg}")
            failed_emotions.append(emotion)
            continue

        emotion_dir = os.path.join(output_dir, emotion)
        os.makedirs(emotion_dir, exist_ok=True)

        for i, frame in enumerate(frames):
            frame_path = os.path.join(emotion_dir, f"frame_{i}.png")
            frame.save(frame_path)

        gif_path = os.path.join(output_dir, f"{emotion}.gif")
        png_path = os.path.join(output_dir, f"{emotion}.png")

        created_gif = create_animation_from_frames(frames, gif_path)
        if created_gif:
            frames[0].save(png_path)
            results[emotion] = {"gif": gif_path, "png": png_path, "frames": len(frames)}
            logger.info(f"成功生成 {emotion}: {gif_path}")
        else:
            logger.error(f"创建GIF失败: {emotion}")
            failed_emotions.append(emotion)

    print("\n" + "=" * 50)
    if results:
        print("✅ 完成！")
    else:
        print("❌ 全部失败！")
    if failed_emotions:
        print(f"⚠️ 失败的情绪: {failed_emotions}")
        logger.warning(f"失败的情绪: {failed_emotions}")
    print("=" * 50)

    emotion_names = {"happy": "开心", "sad": "难过", "excited": "激动"}
    for emotion, result in results.items():
        print(f"\n{emotion_names.get(emotion, emotion)}:")
        print(f"  🎬 {result['gif']} ({result['frames']}帧)")
        print(f"  🖼️ {result['png']}")

    return results if results else None


def main():
    import argparse

    parser = argparse.ArgumentParser(description="角色表情动画生成器")
    parser.add_argument("-r", "--reference", default="reference.png", help="风格参考图")
    parser.add_argument("-c", "--character", required=True, help="人物照片路径")
    parser.add_argument("-o", "--output", default="emotions", help="输出目录")
    parser.add_argument(
        "-e",
        "--emotions",
        nargs="+",
        default=["happy", "sad", "excited"],
        choices=["happy", "sad", "excited"],
        help="情绪列表",
    )
    parser.add_argument("-f", "--frames", type=int, default=8, help="每个情绪的帧数")

    args = parser.parse_args()

    generate_all_emotions(
        reference_path=args.reference,
        character_path=args.character,
        output_dir=args.output,
        emotions=args.emotions,
        frames_per_emotion=args.frames,
    )


if __name__ == "__main__":
    main()

"""
像素动画生成器
功能：将图片分割成 3x3 宫格 → AI生成像素风格 → 合并 → 动画
"""

from PIL import Image
import numpy as np
import os
import requests
import base64
import datetime
from io import BytesIO
from openai import OpenAI

client = OpenAI(
    base_url="https://ark.cn-beijing.volces.com/api/v3",
    api_key=os.environ.get("ARK_API_KEY"),
)

PIXEL_ART_PROMPTS = {
    "default": "转换为像素艺术风格，16位复古游戏风格，色彩鲜艳，细节清晰，保持原图构图和主体位置，纯绿色背景 #00FF00",
    "character": "像素角色立绘，16bit风格，可爱Q版，游戏角色设计，色彩明亮，边缘清晰，纯绿色背景 #00FF00，方便抠图",
    "character_transparent": "像素角色立绘，16bit风格，可爱Q版，游戏角色设计，色彩明亮，边缘清晰，透明背景",
    "scene": "像素场景图，16bit复古游戏背景，细腻的像素细节，丰富的色彩层次",
    "item": "像素道具图标，16bit风格，游戏道具设计，清晰轮廓，鲜艳配色，纯绿色背景 #00FF00",
}


def split_image(input_path, output_dir="splits", grid_size=3):
    """
    将图片分割成 grid_size x grid_size 宫格
    """
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    cell_w = width // grid_size
    cell_h = height // grid_size

    os.makedirs(output_dir, exist_ok=True)

    cells = []
    for row in range(grid_size):
        for col in range(grid_size):
            left = col * cell_w
            upper = row * cell_h
            right = left + cell_w
            lower = upper + cell_h

            cell = img.crop((left, upper, right, lower))
            cell_path = os.path.join(output_dir, f"cell_{row}_{col}.png")
            cell.save(cell_path)
            cells.append(
                {
                    "path": cell_path,
                    "row": row,
                    "col": col,
                    "filename": f"cell_{row}_{col}.png",
                }
            )
            print(f"  ✂️ 分割: [{row}][{col}]")

    print(f"✅ 已分割成 {len(cells)} 个宫格，保存至 {output_dir}/")
    return cells, (cell_w, cell_h), (width, height)


def upload_to_smms(image_path):
    """
    上传图片到 sm.ms 图床（免费）
    注册地址: https://sm.ms/
    """
    api_key = os.environ.get("SMMS_API_KEY")
    if not api_key:
        print("⚠️ 未设置 SMMS_API_KEY，尝试使用 base64 方式...")
        return None

    url = "https://sm.ms/api/v2/upload"
    headers = {"Authorization": api_key}

    with open(image_path, "rb") as f:
        files = {"smfile": f}
        response = requests.post(url, headers=headers, files=files)

    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            return data["data"]["url"]

    return None


def image_to_base64_url(image_path):
    """
    将图片转换为 base64 data URL
    """
    with open(image_path, "rb") as f:
        img_data = f.read()
    b64 = base64.b64encode(img_data).decode()
    return f"data:image/png;base64,{b64}"


def remove_green_background(img, tolerance=30):
    """
    抠除绿色背景，使其变为透明
    适用于绿幕抠图

    Args:
        img: PIL Image 对象
        tolerance: 颜色容差 (0-255)
    """
    img = img.convert("RGBA")
    arr = np.array(img)

    # 绿色范围 (接近 #00FF00)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

    # 识别绿色像素 (绿色通道高，红蓝通道低)
    green_mask = (
        (g > 150)  # 绿色通道高
        & (g > r * 1.5)  # 绿色明显高于红色
        & (g > b * 1.5)  # 绿色明显高于蓝色
        & (abs(g - 255) < tolerance + 50)  # 接近纯绿
    )

    # 设置为透明
    arr[:, :, 3] = np.where(green_mask, 0, a)

    return Image.fromarray(arr)


def smart_remove_background(img, bg_color_hint="green"):
    """
    智能抠图：移除指定颜色的背景

    Args:
        img: PIL Image 对象
        bg_color_hint: 背景颜色提示 ("green", "white", "black")
    """
    img = img.convert("RGBA")
    arr = np.array(img)

    if bg_color_hint == "green":
        # 绿色背景
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        mask = (g > 150) & (g > r * 1.3) & (g > b * 1.3)
    elif bg_color_hint == "white":
        # 白色背景
        mask = (arr[:, :, 0] > 240) & (arr[:, :, 1] > 240) & (arr[:, :, 2] > 240)
    elif bg_color_hint == "black":
        # 黑色背景
        mask = (arr[:, :, 0] < 15) & (arr[:, :, 1] < 15) & (arr[:, :, 2] < 15)
    else:
        return img

    arr[:, :, 3] = np.where(mask, 0, arr[:, :, 3])
    return Image.fromarray(arr)


def upload_to_imgbb(image_path, expiration=None):
    """
    上传图片到 imgbb 图床（免费）
    API 文档: https://api.imgbb.com/
    获取 API Key: https://api.imgbb.com/ (点击 Get API Key)

    Args:
        image_path: 本地图片路径
        expiration: 过期时间(秒)，60-15552000，None表示永不过期
    """
    api_key = os.environ.get("IMGBB_API_KEY")
    if not api_key:
        return None

    url = f"https://api.imgbb.com/1/upload"

    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read()).decode()

    payload = {
        "key": api_key,
        "image": img_base64,
    }
    if expiration:
        payload["expiration"] = expiration

    response = requests.post(url, data=payload)

    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            return data["data"]["url"]

    print(f"  ⚠️ imgbb 上传失败: {response.text}")
    return None


def get_image_url(image_path):
    """
    获取图片URL（尝试多种方式）
    """
    print(f"  📤 上传图片: {os.path.basename(image_path)}")

    # 方式1: 图床上传
    url = upload_to_imgbb(image_path)
    if url:
        print(f"  ✅ imgbb 上传成功")
        return url

    url = upload_to_smms(image_path)
    if url:
        print(f"  ✅ sm.ms 上传成功")
        return url

    # 方式2: base64 data URL
    print("  📦 使用 base64 编码...")
    return image_to_base64_url(image_path)


def generate_pixel_cells(cells, output_dir="generated", prompt=None, grid_size=3):
    """
    调用 API 生成所有宫格的像素风格图片
    """
    if prompt is None:
        prompt = PIXEL_ART_PROMPTS["default"]

    os.makedirs(output_dir, exist_ok=True)

    print(f"\n🎨 开始生成像素风格...")
    print(f"📝 提示词: {prompt}")

    # 获取所有图片URL
    print("\n📤 上传图片...")
    image_urls = []
    for cell in cells:
        url = get_image_url(cell["path"])
        image_urls.append(url)
        cell["url"] = url

    print(f"\n🤖 调用 AI 生成 {len(image_urls)} 个宫格...")

    # 调用API生成多张图
    response = client.images.generate(
        model="doubao-seedream-4-5-251128",
        prompt=f"{prompt}，生成{grid_size}x{grid_size}宫格素材，保持风格统一，边缘可对接",
        size="2K",
        response_format="b64_json",
        stream=True,
        extra_body={
            "image": image_urls,
            "watermark": False,
            "sequential_image_generation": "auto",
            "sequential_image_generation_options": {"max_images": len(image_urls)},
        },
    )

    # 保存生成的图片
    generated_cells = []
    for event in response:
        if event is None:
            continue
        elif event.type == "image_generation.partial_succeeded":
            if event.b64_json is not None:
                idx = len(generated_cells)
                if idx < len(cells):
                    image_data = base64.b64decode(event.b64_json)
                    output_path = os.path.join(
                        output_dir, f"pixel_{cells[idx]['row']}_{cells[idx]['col']}.png"
                    )

                    with open(output_path, "wb") as f:
                        f.write(image_data)

                    generated_cells.append(
                        {
                            "path": output_path,
                            "row": cells[idx]["row"],
                            "col": cells[idx]["col"],
                        }
                    )
                    print(f"  ✅ 生成: [{cells[idx]['row']}][{cells[idx]['col']}]")

    print(f"\n✅ 共生成 {len(generated_cells)} 个宫格")
    return generated_cells


def merge_cells(
    cells_info,
    cell_size,
    original_size,
    output_path="merged.png",
    remove_bg=True,
    bg_color="green",
):
    """
    合并9宫格为完整图片

    Args:
        remove_bg: 是否移除背景
        bg_color: 背景颜色类型 ("green", "white", "black")
    """
    print("\n🧩 合并宫格...")

    cell_w, cell_h = cell_size
    width, height = original_size

    # 创建透明画布
    merged = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    # 按 row, col 排序
    cells_info_sorted = sorted(cells_info, key=lambda x: (x["row"], x["col"]))

    for cell in cells_info_sorted:
        if os.path.exists(cell["path"]):
            img = Image.open(cell["path"]).convert("RGBA")
            # 调整尺寸以匹配宫格大小
            if img.size != (cell_w, cell_h):
                img = img.resize((cell_w, cell_h), Image.NEAREST)

            # 移除背景
            if remove_bg:
                img = smart_remove_background(img, bg_color)

            left = cell["col"] * cell_w
            upper = cell["row"] * cell_h
            merged.paste(img, (left, upper), img)
            print(f"  📍 粘贴: [{cell['row']}][{cell['col']}]")

    merged.save(output_path)
    print(f"✅ 已合并为: {output_path}")
    return merged


def create_animation(
    merged_img, output_path="animation.gif", frames=8, bounce_height=6
):
    """
    为合成后的图片创建动画效果
    """
    print(f"\n🎞️ 生成动画 ({frames} 帧)...")

    width, height = merged_img.size
    frames_list = []

    for i in range(frames):
        # 正弦波动效果
        angle = (i / frames) * 2 * np.pi
        offset_y = int(bounce_height * np.sin(angle))

        # 创建画布
        canvas = Image.new("RGBA", (width, height + bounce_height * 2), (0, 0, 0, 0))
        canvas.paste(merged_img, (0, offset_y + bounce_height), merged_img)

        # 裁剪回原始尺寸
        frame = canvas.crop((0, bounce_height, width, height + bounce_height))
        frames_list.append(frame)

    # 保存GIF
    frames_list[0].save(
        output_path,
        save_all=True,
        append_images=frames_list[1:],
        duration=100,
        loop=0,
        disposal=2,
    )

    print(f"✅ 动画已生成: {output_path}")
    return output_path


def generate_pixel_animation(
    input_path,
    output_dir="output",
    prompt=None,
    grid_size=3,
    frames=8,
    bounce_height=6,
    remove_bg=True,
    bg_color="green",
):
    """
    完整流程：分割 → 生成 → 合并 → 动画

    Args:
        input_path: 输入图片路径
        output_dir: 输出目录
        prompt: 自定义提示词
        grid_size: 宫格大小
        frames: 动画帧数
        bounce_height: 浮动高度
        remove_bg: 是否移除背景
        bg_color: 背景颜色类型 ("green", "white", "black")
    """
    print("=" * 50)
    print("🎬 像素动画生成器")
    print("=" * 50)

    if not os.path.exists(input_path):
        print(f"❌ 找不到图片: {input_path}")
        return None

    if not os.environ.get("ARK_API_KEY"):
        print("❌ 请设置环境变量 ARK_API_KEY")
        print("   export ARK_API_KEY='your-api-key'")
        return None

    os.makedirs(output_dir, exist_ok=True)
    splits_dir = os.path.join(output_dir, "splits")
    generated_dir = os.path.join(output_dir, "generated")

    # 1. 分割图片
    print("\n📁 步骤1: 分割图片")
    cells, cell_size, original_size = split_image(input_path, splits_dir, grid_size)

    # 2. 生成像素风格
    print("\n🎨 步骤2: 生成像素风格")
    generated_cells = generate_pixel_cells(cells, generated_dir, prompt, grid_size)

    if len(generated_cells) != grid_size * grid_size:
        print(f"⚠️ 生成的宫格数量不完整: {len(generated_cells)}/{grid_size * grid_size}")
        if len(generated_cells) == 0:
            return None

    # 3. 合并宫格
    print("\n🧩 步骤3: 合并宫格")
    if remove_bg:
        print(f"   🖼️ 背景移除: {bg_color}")
    merged_path = os.path.join(output_dir, "merged.png")
    merged_img = merge_cells(
        generated_cells, cell_size, original_size, merged_path, remove_bg, bg_color
    )

    # 4. 生成动画
    print("\n🎞️ 步骤4: 生成动画")
    animation_path = os.path.join(output_dir, "animation.gif")
    create_animation(merged_img, animation_path, frames, bounce_height)

    # 5. 保存透明PNG（用于游戏）
    transparent_path = os.path.join(output_dir, "character.png")
    merged_img.save(transparent_path)

    print("\n" + "=" * 50)
    print("✅ 全部完成！")
    print(f"📁 输出目录: {output_dir}/")
    print(f"🖼️ 合并图片: {merged_path}")
    print(f"🎮 游戏角色: {transparent_path} (透明背景)")
    print(f"🎬 动画文件: {animation_path}")
    print("=" * 50)

    return animation_path


def main():
    import argparse

    parser = argparse.ArgumentParser(description="像素动画生成器 - 游戏角色素材生成")
    parser.add_argument("input", nargs="?", default="main.png", help="输入图片路径")
    parser.add_argument("-o", "--output", default="output", help="输出目录")
    parser.add_argument("-p", "--prompt", default=None, help="自定义提示词")
    parser.add_argument("-g", "--grid", type=int, default=3, help="宫格大小 (默认3x3)")
    parser.add_argument("-f", "--frames", type=int, default=8, help="动画帧数")
    parser.add_argument("--no-remove-bg", action="store_true", help="不移除背景")
    parser.add_argument(
        "--bg-color",
        default="green",
        choices=["green", "white", "black"],
        help="背景颜色类型",
    )

    args = parser.parse_args()

    # 默认提示词：绿色背景的角色立绘
    default_prompt = "像素游戏角色立绘，16bit复古风格，可爱Q版，清晰的轮廓，鲜艳的色彩，纯绿色背景 #00FF00，适合游戏使用"

    generate_pixel_animation(
        input_path=args.input,
        output_dir=args.output,
        prompt=args.prompt or default_prompt,
        grid_size=args.grid,
        frames=args.frames,
        remove_bg=not args.no_remove_bg,
        bg_color=args.bg_color,
    )


if __name__ == "__main__":
    main()

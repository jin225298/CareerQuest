#!/usr/bin/env python3
"""
生成面试修炼手册宣传背景图片
"""

from PIL import Image, ImageDraw, ImageFont
import os

# 背景尺寸 (1920x1080 适合视频)
WIDTH = 1920
HEIGHT = 1080

# 颜色定义
BG_COLOR = "#e8f4fc"
GRID_COLOR = (0, 0, 0, 8)  # 3% 黑色透明
STAR_COLOR = (100, 150, 200, 60)  # 淡蓝色装饰


def create_background():
    # 创建基础背景
    img = Image.new("RGBA", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 绘制网格
    grid_size = 40  # 20px * 2 for higher resolution
    for x in range(0, WIDTH, grid_size):
        draw.line([(x, 0), (x, HEIGHT)], fill=GRID_COLOR, width=1)
    for y in range(0, HEIGHT, grid_size):
        draw.line([(0, y), (WIDTH, y)], fill=GRID_COLOR, width=1)

    # 添加装饰星星和月亮
    decorations = [
        ("✦", WIDTH - 200, 80, 120),
        ("✦", WIDTH - 400, 200, 60),
        ("☾", 300, 150, 100),
        ("✦", 150, HEIGHT - 300, 80),
        ("✦", WIDTH - 300, HEIGHT - 200, 100),
        ("✦", 500, 100, 40),
        ("✦", WIDTH - 600, HEIGHT - 400, 50),
        ("✦", 200, 400, 70),
        ("✦", WIDTH - 150, 500, 45),
        ("☾", WIDTH - 200, HEIGHT - 500, 80),
    ]

    try:
        font_large = ImageFont.truetype(
            "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 100
        )
        font_medium = ImageFont.truetype(
            "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 60
        )
        font_small = ImageFont.truetype(
            "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 40
        )
    except:
        font_large = ImageFont.load_default()
        font_medium = font_large
        font_small = font_large

    for symbol, x, y, size in decorations:
        alpha = int(255 * 0.2)  # 20% opacity
        color = (100, 150, 200, alpha)

        # 创建临时图层用于绘制符号
        temp = Image.new("RGBA", (size * 2, size * 2), (0, 0, 0, 0))
        temp_draw = ImageDraw.Draw(temp)

        if size > 80:
            font = font_large
        elif size > 50:
            font = font_medium
        else:
            font = font_small

        temp_draw.text((size // 2, size // 2), symbol, font=font, fill=color)

        # 粘贴到主图
        img.paste(temp, (x - size, y - size), temp)

    return img


def create_card_mockup():
    """创建带卡片效果的背景"""
    img = create_background()
    draw = ImageDraw.Draw(img)

    # 中心卡片区域
    card_width = 600
    card_height = 600
    card_x = (WIDTH - card_width) // 2
    card_y = (HEIGHT - card_height) // 2

    # 绘制半透明卡片背景
    card_overlay = Image.new("RGBA", (card_width, card_height), (255, 255, 255, 20))
    img.paste(card_overlay, (card_x, card_y), card_overlay)

    # 卡片边框
    draw.rounded_rectangle(
        [card_x, card_y, card_x + card_width, card_y + card_height],
        radius=30,
        outline=(255, 255, 255, 30),
        width=4,
    )

    return img


def create_gradient_background():
    """创建渐变背景"""
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))

    # 从上到下渐变
    for y in range(HEIGHT):
        ratio = y / HEIGHT
        r = int(232 * (1 - ratio * 0.1))
        g = int(244 * (1 - ratio * 0.05))
        b = int(252 - ratio * 20)

        for x in range(WIDTH):
            img.putpixel((x, y), (r, g, b, 255))

    # 添加网格
    draw = ImageDraw.Draw(img)
    grid_size = 40
    for x in range(0, WIDTH, grid_size):
        draw.line([(x, 0), (x, HEIGHT)], fill=(0, 0, 0, 5), width=1)
    for y in range(0, HEIGHT, grid_size):
        draw.line([(0, y), (WIDTH, y)], fill=(0, 0, 0, 5), width=1)

    return img


if __name__ == "__main__":
    output_dir = os.path.dirname(__file__)

    # 生成多种背景
    print("生成背景图片...")

    # 1. 基础背景
    bg1 = create_background()
    bg1.save(os.path.join(output_dir, "background_basic.png"))
    print("✅ background_basic.png")

    # 2. 带卡片效果的背景
    bg2 = create_card_mockup()
    bg2.save(os.path.join(output_dir, "background_with_card.png"))
    print("✅ background_with_card.png")

    # 3. 渐变背景
    bg3 = create_gradient_background()
    bg3.save(os.path.join(output_dir, "background_gradient.png"))
    print("✅ background_gradient.png")

    # 4. 纯色背景（用于叠加）
    bg4 = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    bg4.save(os.path.join(output_dir, "background_solid.png"))
    print("✅ background_solid.png")

    print(f"\n📁 输出目录: {output_dir}")
    print(f"📐 尺寸: {WIDTH}x{HEIGHT}")

#!/usr/bin/env python3
"""
生成面试修炼手册4K宣传背景图片
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import os

# 4K 尺寸
WIDTH = 3840
HEIGHT = 2160

# 颜色定义
BG_COLOR = "#e8f4fc"
ACCENT_COLOR = "#3b82f6"


def create_4k_background():
    img = Image.new("RGBA", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 网格线
    grid_size = 60
    grid_color = (0, 0, 0, 6)

    for x in range(0, WIDTH, grid_size):
        draw.line([(x, 0), (x, HEIGHT)], fill=grid_color, width=1)
    for y in range(0, HEIGHT, grid_size):
        draw.line([(0, y), (WIDTH, y)], fill=grid_color, width=1)

    # 装饰元素 - 星星和月亮
    decorations = [
        ("✦", WIDTH - 400, 150, 200, 0.15),
        ("✦", WIDTH - 800, 400, 120, 0.12),
        ("☾", 600, 300, 180, 0.18),
        ("✦", 300, HEIGHT - 600, 150, 0.14),
        ("✦", WIDTH - 600, HEIGHT - 400, 180, 0.16),
        ("✦", 1000, 200, 80, 0.10),
        ("✦", WIDTH - 1200, HEIGHT - 800, 100, 0.11),
        ("✦", 400, 800, 140, 0.13),
        ("✦", WIDTH - 300, 1000, 90, 0.09),
        ("☾", WIDTH - 400, HEIGHT - 1000, 160, 0.15),
        ("✦", 1500, HEIGHT - 300, 110, 0.12),
        ("✦", WIDTH - 1500, 600, 130, 0.14),
    ]

    try:
        fonts = {
            200: ImageFont.truetype(
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 200
            ),
            180: ImageFont.truetype(
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 180
            ),
            160: ImageFont.truetype(
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 160
            ),
            150: ImageFont.truetype(
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 150
            ),
            140: ImageFont.truetype(
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 140
            ),
            130: ImageFont.truetype(
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 130
            ),
            120: ImageFont.truetype(
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 120
            ),
            110: ImageFont.truetype(
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 110
            ),
            100: ImageFont.truetype(
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 100
            ),
            90: ImageFont.truetype(
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 90
            ),
            80: ImageFont.truetype(
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 80
            ),
        }
    except:
        default = ImageFont.load_default()
        fonts = {
            s: default for s in [200, 180, 160, 150, 140, 130, 120, 110, 100, 90, 80]
        }

    for symbol, x, y, size, opacity in decorations:
        alpha = int(255 * opacity)
        color = (100, 150, 200, alpha)

        font = fonts.get(size, fonts[80])

        temp = Image.new("RGBA", (size * 3, size * 3), (0, 0, 0, 0))
        temp_draw = ImageDraw.Draw(temp)
        temp_draw.text((size, size), symbol, font=font, fill=color)

        img.paste(temp, (x - size, y - size), temp)

    return img


def create_blurred_background():
    """创建带模糊光晕效果的背景"""
    img = create_4k_background()

    # 添加光晕效果
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    # 左上角光晕
    for r in range(500, 50, -20):
        alpha = int(30 * (1 - r / 500))
        overlay_draw.ellipse([0, 0, r * 2, r * 2], fill=(59, 130, 246, alpha))

    # 右下角光晕
    for r in range(400, 40, -15):
        alpha = int(25 * (1 - r / 400))
        overlay_draw.ellipse(
            [WIDTH - r * 2, HEIGHT - r * 2, WIDTH, HEIGHT], fill=(236, 72, 153, alpha)
        )

    img = Image.alpha_composite(img, overlay)

    return img


def create_title_background():
    """创建适合放置标题的背景"""
    img = create_4k_background()
    draw = ImageDraw.Draw(img)

    # 中心区域添加半透明白色矩形
    rect_width = 1600
    rect_height = 400
    rect_x = (WIDTH - rect_width) // 2
    rect_y = (HEIGHT - rect_height) // 2

    # 渐变效果
    for i in range(50):
        alpha = int(255 * (1 - i / 50) * 0.1)
        offset = i * 4
        draw.rounded_rectangle(
            [
                rect_x - offset,
                rect_y - offset,
                rect_x + rect_width + offset,
                rect_y + rect_height + offset,
            ],
            radius=40,
            fill=(255, 255, 255, alpha),
        )

    return img


if __name__ == "__main__":
    output_dir = os.path.dirname(__file__)

    print("生成4K背景图片...")

    # 1. 基础4K背景
    bg1 = create_4k_background()
    bg1.save(os.path.join(output_dir, "background_4k.png"))
    print("✅ background_4k.png (3840x2160)")

    # 2. 带光晕效果
    bg2 = create_blurred_background()
    bg2.save(os.path.join(output_dir, "background_4k_glow.png"))
    print("✅ background_4k_glow.png (3840x2160)")

    # 3. 带标题区域
    bg3 = create_title_background()
    bg3.save(os.path.join(output_dir, "background_4k_title.png"))
    print("✅ background_4k_title.png (3840x2160)")

    print(f"\n📁 输出目录: {output_dir}")

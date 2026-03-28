from PIL import Image, ImageDraw
import numpy as np
import os


def create_bounce_gif(input_path, output_path, frames=6, bounce_height=5):
    """
    根据输入图片，生成上下浮动的待机动画 GIF
    - input_path: 主图路径
    - output_path: 输出 GIF 路径
    - frames: 总帧数
    - bounce_height: 上下浮动像素数
    """
    # 打开原图
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size

    frames_list = []

    for i in range(frames):
        # 计算当前帧的偏移量（正弦运动，上下平滑）
        angle = (i / frames) * 2 * np.pi
        offset_y = int(bounce_height * np.sin(angle))

        # 创建透明画布
        new_frame = Image.new("RGBA", (width, height + bounce_height * 2), (0, 0, 0, 0))
        # 粘贴原图到偏移位置
        new_frame.paste(img, (0, offset_y + bounce_height), img)
        # 裁剪回原始大小
        new_frame = new_frame.crop((0, bounce_height, width, height + bounce_height))
        frames_list.append(new_frame)

    # 保存为 GIF
    frames_list[0].save(
        output_path,
        save_all=True,
        append_images=frames_list[1:],
        duration=100,  # 每帧毫秒数，100ms = 0.1秒
        loop=0,
        disposal=2,
    )
    print(f"✅ GIF 已生成: {output_path}")


if __name__ == "__main__":
    # 改成你实际的图片名
    input_file = "main.png"
    output_file = "output.gif"

    if not os.path.exists(input_file):
        print(f"❌ 没找到 {input_file}，请把图片放在当前文件夹，并改名为 main.png")
    else:
        create_bounce_gif(input_file, output_file, frames=8, bounce_height=6)

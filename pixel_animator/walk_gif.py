from PIL import Image, ImageDraw
import numpy as np
import os


def create_walk_gif(input_path, output_path, frames=12, step_height=3):
    """
    根据输入图片，生成走路动画 GIF
    - input_path: 主图路径
    - output_path: 输出 GIF 路径
    - frames: 总帧数
    - step_height: 踏步高度
    """
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size

    frames_list = []

    for i in range(frames):
        # 创建一个透明画布，比原图大一点，方便移动
        canvas = Image.new("RGBA", (width + 20, height + 20), (0, 0, 0, 0))

        # 计算当前帧的偏移量
        phase = (i / frames) * 2 * np.pi  # 0 到 2π

        # 上下起伏（走路时身体会有轻微上下）
        body_offset_y = int(3 * np.sin(phase))

        # 左右腿交替（通过偏移图片位置模拟）
        if i % 2 == 0:
            leg_offset_x = 2
        else:
            leg_offset_x = -2

        # 整体偏移
        offset_x = leg_offset_x
        offset_y = body_offset_y + step_height * abs(np.sin(phase))

        # 把原图贴到画布上
        canvas.paste(img, (offset_x + 10, offset_y + 10), img)

        # 裁剪回原图大小
        final_frame = canvas.crop((10, 10, width + 10, height + 10))

        # 可选：加一个简单的“手臂摆动”效果（通过绘制一个像素点模拟）
        if i % 2 == 0:
            draw = ImageDraw.Draw(final_frame)
            # 在左侧加一个点，模拟手臂
            draw.point((width // 2 - 8, height // 2), fill=(255, 200, 150))
        else:
            draw = ImageDraw.Draw(final_frame)
            draw.point((width // 2 + 8, height // 2), fill=(255, 200, 150))

        frames_list.append(final_frame)

    # 保存为 GIF
    frames_list[0].save(
        output_path,
        save_all=True,
        append_images=frames_list[1:],
        duration=80,  # 走路动画稍快一点
        loop=0,
        disposal=2,
    )
    print(f"✅ 走路 GIF 已生成: {output_path}")


if __name__ == "__main__":
    input_file = "main.png"
    output_file = "walk_output.gif"

    if not os.path.exists(input_file):
        print(f"❌ 没找到 {input_file}，请把图片放在当前文件夹，并改名为 main.png")
    else:
        create_walk_gif(input_file, output_file, frames=12, step_height=4)

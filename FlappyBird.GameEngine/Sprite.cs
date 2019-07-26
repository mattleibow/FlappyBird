using SkiaSharp;

namespace FlappyBird.GameEngine
{
	public class Sprite
	{
		private readonly SKPaint paint;

		public Sprite(SpriteSheet sheet, string name, SKSize size, SKRect bounds)
		{
			SpriteSheet = sheet;
			Name = name;
			Size = size;
			SourceBounds = bounds;
			Visible = true;

			paint = new SKPaint();
		}

		public string Name { get; }

		public SpriteSheet SpriteSheet { get; }

		public SKRect SourceBounds { get; }

		public SKSize Size { get; }

		public bool Visible { get; set; }

		public void Draw(SKCanvas canvas, float x, float y, byte opacity)
		{
			if (!Visible)
				return;

			using (var cf = SKColorFilter.CreateBlendMode(SKColors.White.WithAlpha(opacity), SKBlendMode.DstIn))
			{
				paint.ColorFilter = cf;
				Draw(canvas, x, y, paint);
				paint.ColorFilter = null;
			}
		}

		public void Draw(SKCanvas canvas, float x, float y, SKPaint? paint = null)
		{
			if (!Visible || SpriteSheet.Atlas == null)
				return;

			canvas.DrawImage(SpriteSheet.Atlas, SourceBounds, SKRect.Create(x, y, Size.Width, Size.Height), paint);
		}
	}
}

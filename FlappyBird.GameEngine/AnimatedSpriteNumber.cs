using System;
using System.Collections.Generic;
using SkiaSharp;

namespace FlappyBird.GameEngine
{
	public class AnimatedSpriteNumber
	{
		public const float CountSpeed = 0.5f;

		private readonly SpriteNumber sprite;
		private readonly Animator counter;

		public AnimatedSpriteNumber(Dictionary<string, Sprite> sprites, Func<int, string> numberFormatter)
		{
			sprite = new SpriteNumber(sprites, numberFormatter);

			counter = new Animator();
		}

		public void CountTo(int number)
		{
			number = Math.Max(0, number);
			counter.Start(0, number, Animator.Interpolations.Linear, CountSpeed);
		}

		public bool Finished => counter.Finished;

		public int Value
		{
			get => (int)counter.Value;
			set => sprite.Value = value;
		}

		public float Width => sprite.Width;

		public float Height => sprite.Height;

		public bool Visible
		{
			get => sprite.Visible;
			set => sprite.Visible = value;
		}

		public void Update(TimeSpan dt)
		{
			if (Finished)
				return;

			counter.Update(dt);
			sprite.Value = Value;
		}

		public void Draw(SKCanvas canvas, float x, float y)
		{
			sprite.Draw(canvas, x, y);
		}
	}
}

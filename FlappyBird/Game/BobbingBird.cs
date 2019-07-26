using FlappyBird.GameEngine;
using SkiaSharp;
using System;
using System.Linq;

namespace FlappyBird
{
	public class BobbingBird
	{
		public const float FlapStrength = -5f / 0.015f;
		public const float Gravity = 0.3f / 0.015f;
		public const float MaxSpeed = 8f / 0.015f;

		public const float InitialRotationAcceleration = -10f;
		public const float RotationAcceleration = 0.4f / 0.015f;
		public const float MaxUpRotation = -20f;
		public const float MaxDownRotation = 90f;

		private enum BirdStates
		{
			WingUp,
			WingLevel,
			WingDown
		}

		private const float degToRad = (float)Math.PI / 180f;
		private const float BirdBounceSpeed = 8f / 0.015f;
		private const float BirdBounceHeight = 4f;

		// flap locgic:
		//   every 0.015s, add 15 to v
		//   if v >= [1000/<speed>]
		//     v = 0
		//     next frame
		private const float FastFlapSpeed = 30f;
		private const float SlowFlapSpeed = 10f;

		private readonly SpriteAnimation birdAnimation;

		private float birdBounce = 0f;

		public BobbingBird(SpriteSheet spriteSheet, int bird)
		{
			// flap 3 times in a single animation round
			var up = spriteSheet.Sprites[FlappyBirdSprites.Formats.bird(bird, (int)BirdStates.WingUp)];
			var level = spriteSheet.Sprites[FlappyBirdSprites.Formats.bird(bird, (int)BirdStates.WingLevel)];
			var down = spriteSheet.Sprites[FlappyBirdSprites.Formats.bird(bird, (int)BirdStates.WingDown)];
			birdAnimation = new SpriteAnimation(
				up, level, down, level,
				up, level, down, level,
				up, level, down, level);

			Width = birdAnimation.Frames.Max(f => f.Size.Width);
			Height = birdAnimation.Frames.Max(f => f.Size.Height);
		}

		public float Width { get; private set; }

		public float Height { get; private set; }

		public bool Bobbing { get; set; }

		public float BobOffset { get; set; }

		public void StartHovering()
		{
			Bobbing = true;
			birdAnimation.Speed = SlowFlapSpeed;
			birdAnimation.Looping = true;
			birdAnimation.Enabled = true;
		}

		public void StartFlapping()
		{
			Bobbing = false;
			birdAnimation.CurrentFrame = 0;
			birdAnimation.Speed = FastFlapSpeed;
			birdAnimation.Looping = false;
			birdAnimation.Enabled = true;
		}

		public void Update(TimeSpan dt)
		{
			birdAnimation.Update(dt);

			if (Bobbing)
			{
				birdBounce += (float)dt.TotalSeconds * BirdBounceSpeed;
				if (birdBounce >= 360f)
					birdBounce = 0f;

				BobOffset = (float)Math.Sin(birdBounce * degToRad) * BirdBounceHeight;
			}
		}

		public void Draw(SKCanvas canvas, float angle, float x, float y)
		{
			var bird = birdAnimation.Frames[birdAnimation.CurrentFrame];

			using (new SKAutoCanvasRestore(canvas, true))
			{
				x = x - (Width / 2f);
				y = y + BobOffset;

				canvas.RotateDegrees(angle, x + Width / 2f, y + Height / 2f);
				bird.Draw(canvas, x, y);
			}
		}
	}
}

using FlappyBird.GameEngine;
using SkiaSharp;
using System;

namespace FlappyBird
{
	public class ScrollingGroundScreen : Screen
	{
		protected readonly Random random;
		protected readonly Sprite background;
		protected readonly Sprite animatedGround;
		protected readonly BobbingBird bobbingBird;
		protected readonly float birdGroundOffset;
		protected readonly float groundHeight;

		protected float groundLevel;
		protected float scrollPosition;

		protected SKPoint playerPos;

		protected float speed;
		protected float acceleration;
		protected float angle;
		protected float angleChange;
		protected float angleAcceleration;

		protected bool interactiveMode;
		protected bool scrolling;

		public ScrollingGroundScreen(Game game, SpriteSheet spriteSheet)
			: base(game, spriteSheet)
		{
			random = new Random();

			var day = random.Next(10) > 3; // a random day / night
			var bird = random.Next(3); // a random bird

			background = SpriteSheet.Sprites[day ? FlappyBirdSprites.bg_day : FlappyBirdSprites.bg_night];
			animatedGround = SpriteSheet.Sprites[FlappyBirdSprites.land];
			bobbingBird = new BobbingBird(spriteSheet, bird);
			bobbingBird.StartHovering();
			birdGroundOffset = bobbingBird.Height * 0.75f;
			groundHeight = animatedGround.Size.Height;
			scrolling = true;
		}

		public override void Update(TimeSpan dt)
		{
			base.Update(dt);

			var secs = (float)dt.TotalSeconds;

			bobbingBird.Update(dt);

			if (scrolling)
			{
				scrollPosition -= FlappyBirdGame.ForwardSpeed * secs;
				scrollPosition = scrollPosition % Game.DisplaySize.Width;
			}

			if (interactiveMode)
			{
				// move the bird up/down
				speed = Math.Min(speed + acceleration, BobbingBird.MaxSpeed);
				playerPos.Y += speed * secs;
			}

			// rotate to the direction of travel
			angle += angleChange;
			angleChange += angleAcceleration * secs;
			angle = Math.Min(Math.Max(BobbingBird.MaxUpRotation, angle), BobbingBird.MaxDownRotation);
		}

		public override void Resize(int width, int height)
		{
			groundLevel = height - groundHeight;

			base.Resize(width, height);
		}

		public override void Draw(SKCanvas canvas)
		{
			base.Draw(canvas);

			// background
			background.Draw(canvas, 0f, 0f);

			DrawBackground(canvas);

			// player
			bobbingBird.Draw(canvas, angle, playerPos.X, playerPos.Y);

			// ground
			animatedGround.Draw(canvas, scrollPosition, Game.DisplaySize.Height - animatedGround.Size.Height);
			animatedGround.Draw(canvas, scrollPosition + background.Size.Width, Game.DisplaySize.Height - animatedGround.Size.Height);

			DrawForeground(canvas);
		}

		protected virtual void DrawBackground(SKCanvas canvas)
		{
		}

		protected virtual void DrawForeground(SKCanvas canvas)
		{
		}
	}
}

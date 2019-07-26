using FlappyBird.GameEngine;
using SkiaSharp;
using System;
using System.Collections.Generic;

namespace FlappyBird
{
	public class GameScreen : ScrollingGroundScreen
	{
		private const int PipeGap = 96;
		private const int PipeHole = 96;
		private const int ShortestPipe = 96;
		private const float PipeOffset = 288f;

		private const float FlashDuration = 1f;

		private readonly Sprite pipeUp;
		private readonly Sprite pipeDown;
		private readonly SpriteNumber score;

		private readonly List<SKPoint> pipes;
		private readonly float pipeWidth;

		private readonly TutorialOverlay tutorial;
		private readonly GameOverOverlay gameOver;

		private readonly Animator whiteFlash;
		private readonly SKPaint whiteFlashPaint;

		public GameScreen(Game game, SpriteSheet spriteSheet)
			: base(game, spriteSheet)
		{
			pipeUp = SpriteSheet.Sprites[FlappyBirdSprites.pipe_up];
			pipeDown = SpriteSheet.Sprites[FlappyBirdSprites.pipe_down];
			score = new SpriteNumber(SpriteSheet.Sprites, FlappyBirdSprites.Formats.font);

			pipes = new List<SKPoint>();
			pipeWidth = Math.Max(pipeUp.Size.Width, pipeDown.Size.Width);

			tutorial = new TutorialOverlay(game, spriteSheet);
			gameOver = new GameOverOverlay(game, spriteSheet);

			whiteFlash = new Animator();
			whiteFlashPaint = new SKPaint();
			whiteFlashPaint.Color = SKColors.Transparent;
		}

		public bool GameOver { get; private set; }

		public override void Start()
		{
			base.Start();

			tutorial.Show();
		}

		public override void Resize(int width, int height)
		{
			base.Resize(width, height);

			playerPos = new SKPoint(width / 3f, height / 2.5f);

			tutorial.Resize(width, height);
			gameOver.Resize(width, height);
		}

		public override void Update(TimeSpan dt)
		{
			base.Update(dt);

			// update child objects
			tutorial.Update(dt);
			gameOver.Update(dt);
			whiteFlash.Update(dt);

			// update this screen
			var secs = (float)dt.TotalSeconds;
			var screenRight = Game.DisplaySize.Width;

			if (!GameOver)
			{
				// only start with the pipes once the bird is flapping
				if (interactiveMode)
				{
					// move the pipes
					for (int i = 0; i < pipes.Count; i++)
					{
						var pipe = pipes[i];
						pipe.X -= FlappyBirdGame.ForwardSpeed * secs;

						if (pipe.X + pipeWidth < 0)
						{
							// remove offscreen pipes
							pipes.RemoveAt(i);
							i--;
						}
						else
						{
							// update position
							pipes[i] = pipe;
						}
					}

					// add new pipes
					var hole = random.Next(ShortestPipe, (int)groundLevel - ShortestPipe);
					if (pipes.Count == 0)
					{
						pipes.Add(new SKPoint(screenRight + PipeOffset, hole));
					}
					else
					{
						var last = pipes[pipes.Count - 1];
						if (last.X + pipeWidth < screenRight)
						{
							pipes.Add(new SKPoint(screenRight + PipeGap, hole));
						}
					}
				}

				// crashed into the ground
				var groundPos = groundLevel - birdGroundOffset;
				if (playerPos.Y > groundPos)
				{
					GameOver = true;

					// stop falling through the ground
					playerPos.Y = groundPos;
				}
				else
				{
					// check pipe collisions
				}

				// start the white flash to start the game over animations
				if (GameOver)
				{
					whiteFlash.Start(1f, 0f, Animator.Interpolations.Decelerate, FlashDuration);
				}
			}

			if (GameOver)
			{
				// stop falling
				speed = 0;
				acceleration = 0;

				// stop game
				scrolling = false;
				interactiveMode = false;

				if (!whiteFlash.Finished)
				{
					// we are flashing
					whiteFlashPaint.Color = SKColors.White.WithAlpha((byte)(whiteFlash.Value * 255));
				}
				else if (!gameOver.Visible)
				{
					// show game over now
					gameOver.Show();

					// and clean up game ites
					score.Visible = false;
				}
			}
		}

		protected override void DrawBackground(SKCanvas canvas)
		{
			base.DrawBackground(canvas);

			// pipes
			foreach (var pipePos in pipes)
			{
				var hole = PipeHole / 2f;
				pipeDown.Draw(canvas, pipePos.X, pipePos.Y - pipeDown.Size.Height - hole);
				pipeUp.Draw(canvas, pipePos.X, pipePos.Y + hole);
			}
		}

		protected override void DrawForeground(SKCanvas canvas)
		{
			base.DrawForeground(canvas);

			score.Draw(canvas, (Game.DisplaySize.Width - score.Width) / 2f, groundLevel / 6f);

			tutorial.Draw(canvas);
			gameOver.Draw(canvas);
		}

		public override void Draw(SKCanvas canvas)
		{
			base.Draw(canvas);

			// draw the flash over everything
			if (!whiteFlash.Finished)
				canvas.DrawRect(SKRect.Create(Game.DisplaySize.Width, Game.DisplaySize.Height), whiteFlashPaint);
		}

		public override void Tap(SKPointI point)
		{
			base.Tap(point);

			// if we aren't scrolling, then it is game over
			if (scrolling)
			{
				// start the flapping if this is the first time tapping
				if (!interactiveMode)
				{
					interactiveMode = true;

					// take the current bob and add it to the position
					// before turing off bobbing
					playerPos.Y += bobbingBird.BobOffset;
					bobbingBird.BobOffset = 0f;

					tutorial.Hide();
				}

				// flap those wings!
				bobbingBird.StartFlapping();

				// apply flap force
				if (playerPos.Y > 0)
				{
					// a flap cancels all downward momentum
					speed = BobbingBird.FlapStrength;
					acceleration = BobbingBird.Gravity;
					angleChange = BobbingBird.InitialRotationAcceleration;
					angleAcceleration = BobbingBird.RotationAcceleration;
				}
			}
		}
	}
}

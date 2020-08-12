using System;
using System.Collections.Generic;
using FlappyBird.GameEngine;
using SkiaSharp;

namespace FlappyBird
{
	public class GameScreen : ScrollingGroundScreen
	{
		private const int PipeGap = 96;
		private const int PipeHole = 96;
		private const int ShortestPipe = 96;
		private const float PipeOffset = 288f;

		private const float FlashDuration = 1f;

		private readonly ButtonSprite playButton;
		private readonly ButtonSprite scoresButton;

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
			playButton = new ButtonSprite(SpriteSheet.Sprites[FlappyBirdSprites.button_play]);
			scoresButton = new ButtonSprite(SpriteSheet.Sprites[FlappyBirdSprites.button_score]);

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

		private bool ShowButtons =>
			GameOver && whiteFlash.Finished && gameOver.Finished;

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

			// play + scores buttons
			var buttonSpace = (width - playButton.Size.Width - scoresButton.Size.Width) / 3f;
			var bb = FlappyBirdGame.ButtonShadowBorder.Bottom;
			playButton.Location = new SKPoint(buttonSpace, groundLevel - playButton.Size.Height + bb);
			buttonSpace += playButton.Size.Width + buttonSpace;
			scoresButton.Location = new SKPoint(buttonSpace, groundLevel - scoresButton.Size.Height + bb);
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
				}
				else
				{
					// check pipe collisions
					var playerBounds = GetPlayerBounds(true);
					foreach (var pipePos in pipes)
					{
						var (down, up) = GetPipeBounds(pipePos, true);
						if (down.IntersectsWith(playerBounds) || up.IntersectsWith(playerBounds))
						{
							GameOver = true;
							break;
						}
					}
				}

				// start the white flash to start the game over animations
				if (GameOver)
				{
					whiteFlash.Start(1f, 0f, Animator.Interpolations.Decelerate, FlashDuration);
				}
			}

			if (GameOver)
			{
				// stop falling if on the ground
				var groundPos = groundLevel - birdGroundOffset;
				if (playerPos.Y > groundPos)
				{
					speed = 0;
					acceleration = 0;
					playerPos.Y = groundPos;
				}

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
				var (down, up) = GetPipeBounds(pipePos);
				pipeDown.Draw(canvas, down.Left, down.Top);
				pipeUp.Draw(canvas, up.Left, up.Top);
			}
		}

		protected override void DrawForeground(SKCanvas canvas)
		{
			base.DrawForeground(canvas);

			score.Draw(canvas, (Game.DisplaySize.Width - score.Width) / 2f, groundLevel / 6f);

			tutorial.Draw(canvas);
			gameOver.Draw(canvas);

			if (ShowButtons)
			{
				// play + scores buttons
				playButton.Draw(canvas);
				scoresButton.Draw(canvas);
			}
		}

		public override void Draw(SKCanvas canvas)
		{
			base.Draw(canvas);

			// draw the flash over everything
			if (!whiteFlash.Finished)
				canvas.DrawRect(SKRect.Create(Game.DisplaySize.Width, Game.DisplaySize.Height), whiteFlashPaint);
		}
		public override void TouchDown(SKPointI point)
		{
			base.TouchDown(point);

			if (ShowButtons)
			{
				playButton.TouchDown(point);
				scoresButton.TouchDown(point);
			}
		}

		public override void TouchUp(SKPointI point)
		{
			base.TouchUp(point);

			if (ShowButtons)
			{
				playButton.TouchUp(point);
				scoresButton.TouchUp(point);
			}
		}

		public override void Tap(SKPointI point)
		{
			base.Tap(point);

			if (ShowButtons)
			{
				if (playButton.HitTest(point))
					PlayTapped?.Invoke(this, EventArgs.Empty);
				else if (scoresButton.HitTest(point))
					ScoresTapped?.Invoke(this, EventArgs.Empty);
			}

			// if we aren't scrolling, then it is game over
			if (!scrolling)
				return;

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

		public event EventHandler? PlayTapped;

		public event EventHandler? ScoresTapped;

		protected (SKRect down, SKRect up) GetPipeBounds(SKPoint pipePos, bool collision = false)
		{
			var hole = PipeHole / 2f;

			var downPos = new SKPoint(pipePos.X, pipePos.Y - pipeDown.Size.Height - hole);
			var upPos = new SKPoint(pipePos.X, pipePos.Y + hole);

			var down = SKRect.Create(downPos, pipeDown.Size);
			var up = SKRect.Create(upPos, pipeUp.Size);

			if (collision)
			{
				down.Inflate(-2, 0);
				up.Inflate(-2, 0);
			}

			return (down, up);
		}
	}
}

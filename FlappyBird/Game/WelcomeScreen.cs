using FlappyBird.GameEngine;
using SkiaSharp;
using System;

namespace FlappyBird
{
	public class WelcomeScreen : ScrollingGroundScreen
	{
		private const float GrassHeight = 22f;

		private readonly ButtonSprite playButton;
		private readonly ButtonSprite scoresButton;
		private readonly ButtonSprite rateButton;
		private readonly Sprite title;
		private readonly Sprite copyright;

		private SKPoint titlePos;
		private SKPoint copyrightPos;

		public WelcomeScreen(FlappyBirdGame game, SpriteSheet spriteSheet)
			: base(game, spriteSheet)
		{
			playButton = new ButtonSprite(SpriteSheet.Sprites[FlappyBirdSprites.button_play]);
			scoresButton = new ButtonSprite(SpriteSheet.Sprites[FlappyBirdSprites.button_score]);
			rateButton = new ButtonSprite(SpriteSheet.Sprites[FlappyBirdSprites.button_rate]);
			title = SpriteSheet.Sprites[FlappyBirdSprites.title];
			copyright = SpriteSheet.Sprites[FlappyBirdSprites.brand_copyright];
		}

		public override void Resize(int width, int height)
		{
			base.Resize(width, height);

			// the layout of this screen is:
			//  - the title at eye level at 1/3 the way down the screen
			//  - the ground resting on the bottom
			//  - the big buttons resting on the ground
			//  - the bird is centered in the space above the ground
			//  - the rate button is 2/3 in the space above the ground
			//  - the copyright is just below the grass

			var third = height / 3f;

			// title
			var titleTop = third - title.Size.Height / 2f;
			titlePos = new SKPoint((width - title.Size.Width) / 2f, titleTop);

			// bird
			playerPos = new SKPoint(width / 2f, groundLevel / 2f);

			// rate button
			rateButton.Location = new SKPoint((width - rateButton.Size.Width) / 2f, groundLevel / 1.5f);

			// play + scores buttons
			var buttonSpace = (width - playButton.Size.Width - scoresButton.Size.Width) / 3f;
			var bb = FlappyBirdGame.ButtonShadowBorder.Bottom;
			playButton.Location = new SKPoint(buttonSpace, groundLevel - playButton.Size.Height + bb);
			buttonSpace += playButton.Size.Width + buttonSpace;
			scoresButton.Location = new SKPoint(buttonSpace, groundLevel - scoresButton.Size.Height + bb);

			// copyright
			copyrightPos = new SKPoint((width - copyright.Size.Width) / 2f, groundLevel + GrassHeight);
		}

		protected override void DrawForeground(SKCanvas canvas)
		{
			base.DrawForeground(canvas);

			// title
			title.Draw(canvas, titlePos.X, titlePos.Y);

			// rate button
			rateButton.Draw(canvas);

			// play + scores buttons
			playButton.Draw(canvas);
			scoresButton.Draw(canvas);
		}

		public override void Draw(SKCanvas canvas)
		{
			base.Draw(canvas);

			copyright.Draw(canvas, copyrightPos.X, copyrightPos.Y);
		}

		public override void TouchDown(SKPointI point)
		{
			base.TouchDown(point);

			playButton.TouchDown(point);
			scoresButton.TouchDown(point);
			rateButton.TouchDown(point);
		}

		public override void TouchUp(SKPointI point)
		{
			base.TouchUp(point);

			playButton.TouchUp(point);
			scoresButton.TouchUp(point);
			rateButton.TouchUp(point);
		}

		public override void Tap(SKPointI point)
		{
			base.Tap(point);

			if (rateButton.HitTest(point))
				RatingsTapped?.Invoke(this, EventArgs.Empty);
			else if (playButton.HitTest(point))
				PlayTapped?.Invoke(this, EventArgs.Empty);
			else if (scoresButton.HitTest(point))
				ScoresTapped?.Invoke(this, EventArgs.Empty);
		}

		public event EventHandler? RatingsTapped;

		public event EventHandler? PlayTapped;

		public event EventHandler? ScoresTapped;
	}
}

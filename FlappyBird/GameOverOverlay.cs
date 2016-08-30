using System;
using SkiaSharp;

using FlappyBird.GameEngine;
using FlappyBird.Sprites;

namespace FlappyBird
{
    public class GameOverOverlay : Overlay
    {
        private const float FlashDuration = 1.0f;
        private static InterperlatorDelegate FlashInterpolator = Animator.Interpolations.Decelerate;

        private const float InitialBounceOffset = -1.0f;
        private const float InitialBounceSpeed = -2.0f / 0.015f;
        private const float BounceAcceleration = 0.25f / 0.015f;

        private readonly Sprite gameOver;
        private readonly Sprite land;

        private readonly Animator fadeAnimator;

        private SKPoint position;
        private float offset;
        private float offsetSpeed;

        public GameOverOverlay(Game game, SpriteSheet spriteSheet)
            : base(game, spriteSheet)
        {
            gameOver = SpriteSheet.Sprites[FlappyBirdSprites.text_game_over];
            land = SpriteSheet.Sprites[FlappyBirdSprites.land];

            fadeAnimator = new Animator();
        }

        public override void Show()
        {
            base.Show();

            fadeAnimator.Start(0f, 1f, FlashInterpolator, FlashDuration);

            offset = InitialBounceOffset;
            offsetSpeed = InitialBounceSpeed;

            Visible = true;
            Finished = false;
        }

        public override void Hide()
        {
            base.Hide();

            fadeAnimator.Start(1f, 0f, FlashInterpolator, FlashDuration);

            offset = 0;

            Finished = false;
        }

        public override void Resize(int width, int height)
        {
            base.Resize(width, height);

            position = new SKPoint((width - gameOver.Size.Width) / 2f, (height - land.Size.Height) / 3f);
        }

        public override void Update(TimeSpan dt)
        {
            base.Update(dt);

            // the fade
            fadeAnimator.Update(dt);

            // the bounce
            if (offset < 0)
            {
                offset += (int)(offsetSpeed * dt.TotalSeconds);
                offsetSpeed += BounceAcceleration;
            }
            else
            {
                offset = 0;
            }

            // finished when both are done
            if (offset >= 0 && fadeAnimator.Finished)
            {
                Finished = true;
                if (fadeAnimator.Value == 0f)
                {
                    Visible = false;
                }
            }
        }

        public override void Draw(SKCanvas canvas)
        {
            base.Draw(canvas);

            if (Visible)
            {
                var alpha = (byte)(fadeAnimator.Value * 255);
                gameOver.Draw(canvas, position.X, position.Y + offset, alpha);
            }
        }
    }
}

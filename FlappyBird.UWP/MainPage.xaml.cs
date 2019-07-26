namespace FlappyBird.UWP
{
	public sealed partial class MainPage
	{
		public MainPage()
		{
			InitializeComponent();

			LoadApplication(new FlappyBird.App());
		}
	}
}

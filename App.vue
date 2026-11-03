<script>
	export default {
		onLaunch: function () {
			// 应用启动时无需额外逻辑，登录状态由 token 判断。
		},
		onShow: function () {},
		onHide: function () {}
	}
</script>

<style>
	/* 全局主题变量与基础样式 */
	page {
		background: #fffaf7;
		color: #3d2530;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
			"Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
		font-size: 14px;
		-webkit-font-smoothing: antialiased;
	}

	view,
	text,
	input,
	textarea,
	button {
		box-sizing: border-box;
	}

	/* #ifdef H5 */
	html,
	body {
		height: 100%;
		margin: 0;
		background: #fffaf7;
	}

	uni-app,
	uni-page,
	uni-page-wrapper,
	uni-page-body {
		height: 100%;
	}
	/* #endif */
</style>

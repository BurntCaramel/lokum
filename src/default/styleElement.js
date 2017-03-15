const styleElement = `<style>
*{
	margin:0;
	padding:0;
}

html{
	font-size:18px;
	font-size:calc(112.5% + 2 * (100vw - 600px) / 400);
}
body {
	box-sizing:border-box;
	max-width:100vw;
	margin:auto;
	padding:0 1.333333333rem;
	line-height:1.333333333rem;
	font-family:system,-apple-system,-webkit-system-font,BlinkMacSystemFont,Helvetica Neue,Helvetica,Segoe UI,Roboto,Arial,freesans,sans-serif;
	-webkit-hypens:auto;
	-ms-hypens:auto;
	hypens:auto;
	color:#111;
	background-color:#fbfbfb;
}
header > *,
section > *,
main > article > *,
section article > * {
	max-width:30rem;
	margin-left:auto;
	margin-right:auto;
}

article > *,
header > *,
section > *,
figure > * {
	margin-bottom:1.333333333rem;
}

header + section > h2:first-child,
header h1 {
	text-align:center;
}
header h1 {
	font-size:2rem;
	line-height:2.666666666rem;
	top:.6666666659999998rem;
}
header h1, h2 {
	position:relative;
	font-weight:700;
}
h2 {
	font-size:1.2rem;
	line-height:1.333333333rem;
	top:.13333333299999994rem;
}
h3, nav dt {
	text-transform:uppercase;
	font-weight:700;
}
pre {
	overflow:auto;
	width:calc(50% + 15rem);
	margin-left:calc((100% - 30rem) / 2);
	background-color:#fff;
} 
section article, dd, dl, figure {
	margin:auto;
	width:auto;
}
img {
	display: block;
	margin: auto;
	max-width: 100%;
	height: auto;
}
</style>
`

module.exports = styleElement
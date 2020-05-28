import React from 'react';

const MyButton: React.FC = () => (
	<div>
		<button
			onClick={() => window.alert('Hello!!!')}
			style={{
				width: '100%',
				display: 'block',
			}}
		>
			Hello
		</button>
	</div>
);

export default MyButton;

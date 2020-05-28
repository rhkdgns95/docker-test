import React from 'react';

interface Props {
	text: string;
}

const Text: React.FC<Props> = ({ text }) => <div>Text: {text}</div>;

export default Text;

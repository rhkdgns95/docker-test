import React from 'react';

interface IProps {
	title: string;
}

const Header: React.FC<IProps> = ({ title }: IProps) => <h1>{title}</h1>;

export default Header;

import { expect } from 'chai';
import { mount, shallow, configure, render } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({ adapter: new Adapter() });

global.expect = expect;
global.mount = mount;
global.render = render;
global.shallow = shallow;
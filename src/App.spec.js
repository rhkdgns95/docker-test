import React from 'react';
import App from './App';

const HookWrapper = (props) => {
  const hook = props.hook ? props.hook() : undefined;
  return <div hook={hook}/>;
};

/*  
 *  it블록에 테스트 작성시 보통 다음 3단계를 거침
 *   1. 값을 정의(arrange)
 *   2. 실행(act)
 *   3. 단언(assert)
 */
describe("App Component", () => {
  /**
   *  테스팅 진행
   *   1. 컴포넌트 존재유무 확인.
   *   2. 컴포넌트 props값 확인.
   *   3. 컴포넌트의 렌더링 될 때, 하위 컴포넌트 확인.
   */
  context('unit[0]', () => {  // [1]
    it('컴포넌트 App 존재', () => {
      const wrapper = shallow(<App />);
      expect(wrapper).to.exist;
    });

    it('Hook의 하위 컴포넌트 App 존재', () => {
      const hookWrapper = shallow(<HookWrapper hook={() => <App />}/>);
      expect(hookWrapper.find('div')).to.exist;
    });
  });

  context('unit[1]', () => {  // [2]
    it('props: { title: "hello" }', () => {
      const hookWrapper = shallow(<HookWrapper hook={() => <App title={'hello'}/>}/>);
      const { hook } = hookWrapper.find('div').props();
      const { title } = hook.props;
      expect(title).to.equal('hello');
    });

    it('props: { title: "bye" }', () => {
      const hookWrapper = shallow(<HookWrapper hook={() => <App title={'bye'}/>}/>);
      const { hook } = hookWrapper.find('div').props();
      const { title } = hook.props;
      expect(title).to.equal('bye')
    });

    it('props: { title: 12345 }', () => {
      const hookWrapper = shallow(<HookWrapper hook={() => <App title={12345}/>}/>);
      const { hook } = hookWrapper.find('div').props();
      const { title } = hook.props;
      expect(title).to.equal(12345);
    });
  });
 

  context('unit[2]', () => {  // [3]
    let wrapper;
    
    before("", () => {
      wrapper = shallow(<App />);
    });
    
    it("렌더링시 포함되는 엘리먼트의 총 갯수 7개", () => {
      expect(wrapper.find('*')).to.have.length(7);
    });

    it("렌더링시 포함되는 엘리먼트 div는 0개", () => {
      expect(wrapper.find('div')).to.have.length(0);
    });
    
    it("렌더링시 포함되는 엘리먼트 h1 1개", () => {
      expect(wrapper.find('h1')).to.have.length(1);
    });

    it("렌더링시 포함되는 엘리먼트 p는 4개", () => {
      expect(wrapper.find('p')).to.have.length(4);
    });

  });
});
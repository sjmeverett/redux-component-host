import { History } from 'history';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Route, Redirect, Switch } from 'react-router-dom';
import { ConnectedRouter } from 'react-router-redux';
import * as Redux from 'redux';
import * as SideEffects from 'side-effects';
import { Action } from 'ts-actions';
import { WaitForFunction } from 'wait-for-dependencies';


export default class ComponentHost<TState, TSections extends DefaultSections> {
  initialState: Partial<TState>;
  reducers: ReducerFragment<TState>[];
  effectors: SideEffects.Effector[];
  enhancers: Redux.StoreEnhancer<TState>[];
  middleware: Redux.Middleware[];
  parts: Part[];
  isDevelopment: boolean;

  private _store: Redux.Store<TState>;


  constructor() {
    this.initialState = {};
    this.reducers = [];
    this.effectors = [];
    this.enhancers = [];
    this.middleware = [];
    this.parts = [];
  }


  setInitialState<K extends keyof TState>(key: K, value: TState[K]) {
    this.initialState[key] = value;
    return this;
  }


  addReducer(reducer: ReducerFragment<TState>) {
    this.reducers.push(reducer);
    return this;
  }


  addEffector(effector: SideEffects.Effector) {
    this.effectors.push(effector);
    return this;
  }


  addEnhancer(enhancer: Redux.StoreEnhancer<TState>) {
    this.enhancers.push(enhancer);
    return this;
  }

  addMiddleware(middleware: Redux.Middleware) {
    this.middleware.push(middleware);
    return this;
  }


  addPart(path: string, Component: React.ComponentClass<any> | React.StatelessComponent<any>,
      section: keyof TSections = 'main', exact=true) {
    this.parts.push({path, Component, section, exact});
    return this;
  }


  loadComponents(dirname: string) {
    const req = require['context'](__dirname, true, /[\/\.]component$/);
    const wait = new WaitForFunction();

    const initFns = req.keys()
      .map((key) => req(key).initReduxComponent)
      .filter((init) => init != null);

    return wait.run(initFns, this);
  }


  private createStore() {
    const reducer = SideEffects.combineReducers(...this.reducers) as SideEffects.Reducer<TState>;

    const enhancers = [
      SideEffects.installSideEffects(...this.effectors),
      ...this.enhancers
    ];

    if (this.middleware.length) {
      enhancers.push(Redux.applyMiddleware(...this.middleware));
    }

    const reduxTools = window['__REDUX_DEVTOOLS_EXTENSION__'];
  
    if (reduxTools) {
      enhancers.push(reduxTools());
    }

    const enhancer = Redux.compose.apply(undefined, enhancers);

    return Redux.createStore<TState>(reducer, this.initialState as TState, enhancer);
  }


  get store() {
    if (this._store == null) {
      this._store = this.createStore();
    }
    return this._store;
  }


  getSection(name: keyof TSections, exclusive=true) {
    const Section = exclusive ? Switch : 'div';
    const parts = this.parts.filter((part) => part.section === name);

    return (
      <Section>
        {parts.map((part, i) => (
          <Route exact={part.exact} path={part.path} component={part.Component} key={i} />
        ))}
      </Section>
    );
  }


  render(history: History, Page: React.StatelessComponent<any> | React.ComponentClass<any> = DummyComponent,
      rootId='root') {
      
    this.store.dispatch({type: 'app/RENDER'});

    const content = (
      <Provider store={this.store}>
        <ConnectedRouter history={history}>
          <Page>
            {this.getSection('main')}
          </Page>
        </ConnectedRouter>
      </Provider>
    );

    const root = document.getElementById(rootId);
    ReactDOM.render(content, root);
  }
};


export interface DefaultSections {
  main;
};


const DummyComponent = (props) => (
  <div>
    {props.children}
  </div>
);


export interface Part {
  section: string;
  path: string;
  Component: React.ComponentClass<any> | React.StatelessComponent<any>;
  exact: boolean;
};


export type ReducerFragment<TState>
  = Partial<SideEffects.DeepReducerMap<TState>> 
  | SideEffects.ReducerMaybeWithSideEffects<TState>;

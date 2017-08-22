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


/**
 * A container for registering Redux components.
 */
export default class ComponentHost<TState, TSections extends DefaultSections = DefaultSections> {
  /**
   * The initial state of the Redux application.
   */
  initialState: Partial<TState>;
  /**
   * An array of reducers registered for the application.
   */
  reducers: ReducerFragment<TState>[];
  /**
   * An array of registered side-effects effectors.
   */
  effectors: SideEffects.Effector[];
  /**
   * An array of registered Redux store enhancers.
   */
  enhancers: Redux.StoreEnhancer<TState>[];
  /**
   * An array of registered Redux middleware.
   */
  middleware: Redux.Middleware[];
  /**
   * An array of page parts registered for different routes.
   */
  parts: Part[];

  private _store: Redux.Store<TState>;


  constructor() {
    this.initialState = {};
    this.reducers = [];
    this.effectors = [];
    this.enhancers = [];
    this.middleware = [];
    this.parts = [];
  }

  /**
   * Sets the initial value for the specified key of the application state.
   * @param key the key of the state hash to set
   * @param value the initial value
   */
  setInitialState<K extends keyof TState>(key: K, value: TState[K]) {
    this.initialState[key] = value;
    return this;
  }

  /**
   * Registers a reducer.
   * @param reducer the reducer to register
   */
  addReducer(reducer: ReducerFragment<TState>) {
    this.reducers.push(reducer);
    return this;
  }

  /**
   * Registers a side-effect effector.
   * @param effector the effector function to register
   */
  addEffector(effector: SideEffects.Effector) {
    this.effectors.push(effector);
    return this;
  }

  /**
   * Registers a Redux store enhancer.
   * @param enhancer the enhancer function to register
   */
  addEnhancer(enhancer: Redux.StoreEnhancer<TState>) {
    this.enhancers.push(enhancer);
    return this;
  }

  /**
   * Registers a Redux store middleware function.
   * @param middleware the middleware function to register
   */
  addMiddleware(middleware: Redux.Middleware) {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Adds a page part.
   * @param path the path the part is to show for
   * @param Component the component to render
   * @param section the name of the page section the component is to be rendered in
   * @param exact whether or not the route matching is to be exact
   */
  addPart(path: string, Component: React.ComponentClass<any> | React.StatelessComponent<any>,
      section: keyof TSections = 'main', exact=true) {
    this.parts.push({path, Component, section, exact});
    return this;
  }

  /**
   * Automagically loads components from using the specified webpack require context.  By default it
   * looks for an exported function called `initReduxComponent`, and runs it with this host as the
   * first argument, and a 'wait-for-dependencies' waiter as the second argument.
   * @param requireContext a webpack require.context result
   * @param fnName the name of the function to run
   */
  loadComponents(requireContext, fnName = 'initReduxComponent') {
    const wait = new WaitForFunction();

    const initFns = requireContext.keys()
      .map((key) => requireContext(key).initReduxComponent)
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

  /**
   * Gets the store - created on first access.
   */
  get store() {
    if (this._store == null) {
      this._store = this.createStore();
    }
    return this._store;
  }

  /**
   * Gets the section with the specified name.
   * @param name the name of the section to get
   * @param exclusive true to render only the first part that matches the route; otherwise, false
   */
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

  /**
   * Render the application
   * @param history the history implementation to use
   * @param Page the page component to wrap the whole application in
   * @param rootId the ID of the root element to render the application into
   */
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

/**
 * The default section names.
 */
export interface DefaultSections {
  main;
};


const DummyComponent = (props) => (
  <div>
    {props.children}
  </div>
);

/**
 * A page part for a particular route path.
 */
export interface Part {
  /**
   * The name of the section the part will be rendered in.
   */
  section: string;
  /**
   * The route path the section is to be rendered for.
   */
  path: string;
  /**
   * The React component representing the section.
   */
  Component: React.ComponentClass<any> | React.StatelessComponent<any>;
  /**
   * Whether or not to use exact route matching.
   */
  exact: boolean;
};

/**
 * A reducer for the given application state or part thereof.
 */
export type ReducerFragment<TState>
  = Partial<SideEffects.DeepReducerMap<TState>> 
  | SideEffects.ReducerMaybeWithSideEffects<TState>;

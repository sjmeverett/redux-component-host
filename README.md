# redux-component-host

Compose your redux application from reusable components.

## Usage

Install:

```
$ npm install --save redux-component-host
```

Quick start:

```ts
import { AppState } from './state';
import createHistory from 'history/createBrowserHistory';
import ComponentHost from 'redux-component-host';

// instantiate the host and load the components from the components dir
const host = new ComponentHost<AppState>();
host.loadComponents(__dirname + '/components');

// create the history object and render the application
const history = createHistory();
host.render(history);
```

The `loadComponents` method looks for files called 'component' or '[something].component', and requires them.  Then it looks for a function called `initReduxComponent` (by default) and invokes it, passing the `ComponentHost` instance.  The function can then register reducers, state, routes, etc.

```ts
export function initReduxComponent(host: ComponentHost<AppState>) {
  host
    .addReducer({users: reducer})
    .setInitialState('users', [])
    .addPart('/users', ListUsersComponent);
}
```

## Sections

A "section" is an area on a rendered page which shows one or more of a number of "parts", depending on the current route.  The "main" section is the one which is used in `render`.  Parts which are rendered within this section may also render sub-sections, using the `getSection` method of `ComponentHost`.  This method takes two parameters: the name of the section, and whether the section is to show only the first part matching the current route, rather than all matching.

The example below defines an extra section called "nav", and shows how it can be used to construct a navigation area:

```tsx
// this dummy interface will constrain the names that are allowed to
// be supplied to `addPart` and `getSection`
interface Sections { main; nav; }
const host = new ComponentHost<AppState, Sections>();

// in the Users component
// add the main component
host.addPart('/users', UsersComponent);
// add a nav link to the "nav" section
// last param means don't match exactly, so will display for all routes
host.addPart('/', UsersNavLink, 'nav', false);

// define a page component, a sort of master page
const Page = (props) => (
  <div>
    <nav>{host.getSection('nav', false)}</nav>
    <div>
      {props.children}
    </div>
  </div>
);

// render the app
host.render(history, Page);
```

## API

### `ComponentHost<TState, TSections extends DefaultSections = DefaultSections>` class

A container for registering Redux components.

**Generic arguments**

- `TState` - the application state type
- `TSections` - an interface with keys to name the sections

#### `setInitialState<K extends keyof TState>(key: K, value: TState[K])`

Sets the initial value for the specified key of the application state.

**Params**

- `key` - the key of the state hash to set
- `value` - the initial value

#### `addReducer(reducer: ReducerFragment<TState>)`

Registers a reducer.

**Params**

- `reducer` - the reducer to register

#### `addEffector(effector: SideEffects.Effector)`

Registers a side-effect effector.

**Params**

- `effector` - the effector function to register


#### `addEnhancer(enhancer: Redux.StoreEnhancer<TState>)`

Registers a Redux store enhancer.

**Params**

- `enhancer` - the enhancer function to register


#### `addMiddleware(middleware: Redux.Middleware)`

Registers a Redux store middleware function.

**Params**

- `middleware` - the middleware function to register


#### `addPart(path: string, Component: React.ComponentClass<any> | React.StatelessComponent<any>, section: keyof TSections = 'main', exact=true)`

Adds a page part.

**Params**

* `path` - the path the part is to show for
* `Component` - the component to render
* `section` - the name of the page section the component is to be rendered in
* `exact` - whether or not the route matching is to be exact

#### `loadComponents(dirname: string, regex = /[\/\.]component$/, fnName = 'initReduxComponent')`

Automagically loads components from the specified directory.  The specified directory is searched recursively for "component" and "foo.component" modules by default, or matching the specified regex otherwise.  By default it looks for an exported function called `initReduxComponent`, and runs it with this host as the first argument, and a 'wait-for-dependencies' waiter as the second argument.

**Params**

* `dirname` - the directory to search in
* `regex` - a regex to match file names
* `fnName` - the name of the function to run

#### `get store()`

Gets the store - created on first access.

#### `getSection(name: keyof TSections, exclusive=true)`

Gets the section with the specified name.

**Params**

* `name` - the name of the section to get
* `exclusive` - true to render only the first part that matches the route; otherwise, false


#### `render(history: History, Page: React.StatelessComponent<any> | React.ComponentClass<any> = DummyComponent, rootId='root')`

Render the application.

**Params**

* `history` - the history implementation to use
* `Page` - the page component to wrap the whole application in
* `rootId` - the ID of the root element to render the application into


### `Part` interface

A page part for a particular route path.

#### `section: string`

The name of the section the part will be rendered in.

#### `path: string`

The route path the section is to be rendered for.

#### `Component: React.ComponentClass<any> | React.StatelessComponent<any>`

The React component representing the section.

#### `exact: boolean`

Whether or not to use exact route matching.


### `ReducerFragment<TState>` type

A reducer for the given application state or part thereof.

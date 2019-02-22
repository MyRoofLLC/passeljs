const EventEmitter = require("events")
const Components = require("./components")
const { InternalComponentStore } = require("./file_store")


// global state
const global = {}
const globalChanged = new EventEmitter()

// components listed by name
const initializedComponents = {}

// initialize new top level components
const use = (Comp, propsToInherit)=>{
    const comp = new Comp({global, globalChanged, propsToInherit, initializedComponents})

    if (!comp.componentName) throw new Error(`Component names are required`)
    if (initializedComponents[comp.componentName]) throw new Error(`Component name '${comp.componentName}' is already used. Duplicate names not allowed`)

    // define the global and file system state path. All top level components use just their component name
    comp._component_path = [comp.componentName]
    comp._component_depth = 0

    if (comp.options && comp.options.fsState){

        // construct component store
        const internalComponentFileStore = new InternalComponentStore(comp.componentName)
        comp._internal_component_file_store = internalComponentFileStore

        // Load initial fsStore state into component or generate from default state
        const fsState = internalComponentFileStore.getState()
        if (fsState) comp.state = {...comp.state, ...fsState}
        else {
            let data = {}
            comp.options.fsState.options.include.forEach(object=>{
                data[object.key] = comp.state[object.key]
            })
            internalComponentFileStore.setState(data)
        }
    }

    if (comp.options && comp.options.globalState){
        // load initial global state
        comp.options.globalState.options.include.forEach(object=>{
            if (!global[comp.componentName]) global[comp.componentName] = {}
            global[comp.componentName][object.key] = comp.state[object.key]
        })
    }

    comp._initialized_component_path = [comp.componentName]

    initializedComponents[comp.componentName] = {
        component: comp,
        children: {}
    }

    comp.componentWillMount()
}

// mount components
const mountComponents = ()=>{
    let mount = (object)=>{
        Object.values(object).forEach((comp)=>{
            comp.component.componentDidMount()
            if (comp.children) mount(comp.children)
        })
    }

    mount(initializedComponents)
}

module.exports = {
    Components,
    global,
    globalChanged,
    use,
    mountComponents
}


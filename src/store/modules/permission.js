import { asyncRouterMap, constantRouterMap } from '@/router'

function hasPermission(roles, route) {
  if (route.meta && route.meta.role) {
    return route.meta.role.indexOf(roles) > -1
  } else {
    return true
  }
}

const state = {
  routers: constantRouterMap,
  addRouters: []
}

const mutations = {
  SET_ROUTERS: (state, routers) => {
    state.addRouters = routers
    console.log(state.addRouters)
    state.routers = constantRouterMap.concat(routers)
  }
}
const actions = {
  GenerateRoutes({ commit }, data) { // data参数传入的是角色
    return new Promise(resolve => {
      const { roles } = data
      const accessedRouters = asyncRouterMap.filter(v => {
        if (roles.indexOf('admin') >= 0) {
          return true// 如果角色中有admin角色，则返回所有的挂载路由
        }
        if (hasPermission(roles, v)) {
          if (v.children && v.children.length > 0) {
            v.children = v.children.filter(child => {
              if (hasPermission(roles, child)) {
                return child
              }
              return false
            })
            return v
          } else {
            return v
          }
        }
        return false
      })
      commit('SET_ROUTERS', accessedRouters)
      console.log(accessedRouters)
      resolve()
    })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}

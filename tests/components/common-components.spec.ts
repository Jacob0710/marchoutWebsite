import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BaseButton from '~/components/common/BaseButton.vue'
import CategoryTabs from '~/components/common/CategoryTabs.vue'
import EmptyState from '~/components/common/EmptyState.vue'
import SearchInput from '~/components/common/SearchInput.vue'

describe('common component contracts', () => {
  it('renders a disabled semantic button', () => {
    const wrapper = mount(BaseButton, {
      props: { disabled: true },
      slots: { default: 'Save' }
    })

    const button = wrapper.get('button')
    expect(button.text()).toContain('Save')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes()).toHaveProperty('disabled')
    expect(button.classes()).toContain('cursor-not-allowed')
  })

  it('renders navigation through NuxtLink when a destination exists', () => {
    const wrapper = mount(BaseButton, {
      props: { to: '/about', variant: 'secondary' },
      slots: { default: 'About' },
      global: {
        stubs: {
          NuxtLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    })

    expect(wrapper.get('a').attributes('href')).toBe('/about')
    expect(wrapper.text()).toContain('About')
  })

  it('labels search and emits model updates', async () => {
    const wrapper = mount(SearchInput, {
      props: { modelValue: '', label: 'Search activities', placeholder: 'Type a title' }
    })

    const input = wrapper.get('input')
    expect(wrapper.get('label').text()).toContain('Search activities')
    expect(input.attributes('placeholder')).toBe('Type a title')
    await input.setValue('summer')
    expect(wrapper.emitted('update:modelValue')).toEqual([['summer']])
  })

  it('exposes category selection through pressed state and events', async () => {
    const wrapper = mount(CategoryTabs, {
      props: {
        modelValue: 'all',
        items: [
          { label: 'All', value: 'all' },
          { label: 'Projects', value: 'project' }
        ]
      }
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[0]?.attributes('aria-pressed')).toBe('true')
    expect(buttons[1]?.attributes('aria-pressed')).toBe('false')
    await buttons[1]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['project']])
  })

  it('renders an accessible empty-state message', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No activities',
        description: 'Try another filter.'
      }
    })

    expect(wrapper.get('h3').text()).toBe('No activities')
    expect(wrapper.text()).toContain('Try another filter.')
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })
})
